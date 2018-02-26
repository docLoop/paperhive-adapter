'use strict'


const	DocloopEndpoint	=	require('docloop').DocloopEndpoint,
		DocloopError	= 	require('docloop').DocloopError,
		request			=	require('request-promise-native').defaults({json:true}),
		Promise			=	require('bluebird')


/**
 * Class representing a paperhive document.
 * 
 * @memberOf  module:paperhiveAdapter
 * 
 * @extends {DocloopEndpoint}
 */
class PaperhiveSource extends DocloopEndpoint{

	constructor(adapter, {id, _id, identifier, config, decor, data}){

		super(adapter, {
			id,
			_id, 
			identifier, 
			config, 
			decor:	decor || {
						image:		null,
						title:		'Paperhive Document',
						details:	'unknown'
					}, 
			data
		})		


		if(!identifier.document_id)				throw new ReferenceError("PaperhiveSource.constructor() missing identifier.document_id")
		if(adapter.id != identifier.adapter)	throw new Error("PaperhiveSource.constructor() adapter mismatch")
	}


	/**
	 * Fetch document data from the paperhive API
	 * @async
	 * @param  	{String}	document_id		The paperhive document id
	 * @return 	{Object}					The document's data
	 * @throws	{Error}						If paperhive API request fails
	 */
	static async getDocument(document_id){
		try 	{ return request.get('https://paperhive.org/api/documents/'+document_id)} 
		catch(e){ throw new Error("PaperhiveSource.getDocument() unable to get document: "+ e) } //TODO Error type, status codr?

	}


	/**
	 * Creates a new instance of {@link Paperhivesource} from the provided document data
	 * @static
	 * @param  {PaperhiveAdapter}	adapter			The adapter the new source will be associated with.		
	 * @param  {Object}				ph_document		Data of a paperhive document. See {@link PaperhiveSource.getDocument}
	 * @return {Paperhivesource}					New instance of {@link Paperhivesource}
	 */
	static fromDocument(adapter, ph_document){

		if(!adapter || !ph_document)	throw new ReferenceError("PaperhiveSource.fromDocument() missing adapter or paperhive document")
		if(!adapter.id)					throw new ReferenceError("PaperhiveSource.fromDocument() missing adapter id")
		if(!ph_document.id)				throw new ReferenceError("PaperhiveSource.fromDocument() missing document id")

		return 	new PaperhiveSource(adapter, {
						identifier : 	{
											adapter:		adapter.id,
											document_id:	ph_document.id
										},
						decor:			PaperhiveSource.documentToDecor(ph_document)
				})
	}

	/**
	 * Translates document data into {@link EndpointDecoration}.
	 * @static
	 * @param {Object} 	ph_document 	Data of a paperhive document. See {@link PaperhiveSource.getDocument}
	 * @returns {Decoration}
	 */

	static documentToDecor(ph_document){
		return {
					title: 			ph_document.title,
					details: 		ph_document.authors[0].name || ph_document.publisher
				} 
	}



	/**
	 * Tries to guess a document id from provided string and create a new instance of {@link PaperhiveSource} associated with it.
	 * @async
	 * @param  {PaperhiveAdapter}	adapter		The adapter the new source will be associated with.		
	 * @param  {String}				str			A string to guess the document id from.
	 * @return {PaperhiveSource}
	 * @throws {ReferenceError} 				If adapter is missing
	 * @throws {TypeError} 						If str is not a string
	 * @throws {DocloopError} 					If str contains no matchable document_id
	 */
	static async guess(adapter, str){
		var matches, ph_document, document_id, endpoint

		if(!adapter) throw new ReferenceError("PaperhiveSource.guess() missing adapter")

		if(typeof str != 'string') throw new TypeError("PaperhiveSource.guess() only works on strings")

		try {	
			matches 	= 	str.match(/documents\/([^/]+)/) || str.match(/^([^/]+)$/)
			document_id	= 	matches[1]
		}
		catch(e){ throw new DocloopError(`PaperhiveSource.guess() unable to guess document id from input string ${str}: ${e}`, 400) }

			ph_document	=	await this.getDocument(document_id)

		endpoint	=	PaperhiveSource.fromDocument(adapter, ph_document),
		await endpoint.validate()

		return endpoint
	}

	/**
	 * Fetch discussion data form the paperhive API.
	 * @async
	 * @return {Object}
	 * @throws {Error} 		If paperhive API request fails
	 */
	async getDiscussions(){
		var result = await request.get('https://paperhive.org/api/documents/'+this.identifier.document_id+'/discussions')
		return result.discussions
	}


	/**
	 * Convert discussion data into {@link Annotation}
	 * @param  {Object}		discussion
	 * @return {Annotation}
	 */
	phDiscussion2Annotation(discussion){
		return {
			id:						discussion.id,
			sourceName:				this.adapter.config.name,
			sourceHome:				this.adapter.config.home,
			title:					discussion.title,
			author:					discussion.author.displayName,
			body:					discussion.body,
			respectiveContent:		discussion.target.selectors.textQuote.content,
			original:				this.adapter.config.contentLink.replace(/%s/, discussion.target.document),
		}
	}

	/**
	 * Convert reply data into {@link Reply}.
	 * @param  {Object}		discussion
	 * @return {Annotation}
	 */
	phReply2Reply(reply){
		return {
			parentId:				reply.discussion,
			id:						reply.id,
			sourceName:				this.adapter.config.name,
			sourceHome:				this.adapter.config.home,
			author:					reply.author.displayName,
			body:					reply.body,
			original:				this.adapter.config.contentLink.replace(/%s/, reply.document),
		}
	}


	/**
	 * Scan the source for new annotations and replies.
	 * @async
	 * @return {undefined}
	 * @emits annotation
	 * @emits Docloop~reply
	 */
	async scan(){
		var		now			=		Date.now(),
		 		last_scan 	= 		await this.getData('lastScan'),							
				discussions = 		await this.getDiscussions()

		if(!last_scan)	last_scan = 	this.config.includePastAnnotations
										?	0
										:	new Date()

		discussions.forEach( discussion => {

			var updated = new Date(discussion.updatedAt)

			if(updated >= last_scan){			
				this.adapter.emit(
					'annotation', 
					{
						annotation: this.phDiscussion2Annotation(discussion),
						source:		this.skeleton
					} 
				)
			} 

			discussion.replies && discussion.replies.forEach( reply => {
				var updated = new Date(reply.updatedAt)

				if(updated >= last_scan){			
					this.adapter.emit(
						'reply',
						{
							reply:	this.phReply2Reply(reply),
							source:	this.skeleton
						}
					)
				}
			})
		})

		this.setData('lastScan', now)

	}

	/**
	 * Validate the source by checking if the associated document's discussion is readable.
	 * @async
	 * @throws	{DocloopError}	If document's discussion are not readable
	 */
	async validate(){
		try		{	await this.getDiscussions() }
		catch(e){	throw new DocloopError("PaperhiveSource.validate() unable to read discussions: " +e)}
	}


	//TODO:
	async updateDecor(){
		var ph_document = await PaperhiveSource.getDocument(this.identifier.document_id)

		this.decor = PaperhiveSource.documentToDecor(ph_document)
	}


}

module.exports = PaperhiveSource