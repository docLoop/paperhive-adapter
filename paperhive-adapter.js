'use strict'


var		DocLoopAdapter 	= 	require('docloop').DocloopAdapter,
		DocloopError	= 	require('docloop').DocloopError,
		PaperhiveSource	=	require('./paperhive-source.js'),
		request			=	require('request-promise-native').defaults({json:true}),
		Promise			=	require('bluebird')


/**
 * TODO: description!
 * @module  paperhiveAdapter
 */
		

/**
 * Adapter to harvest public annotations from paperhive.
 * 
 * @memberof module:paperhiveAdapter
 * 
 * @extends		{DocloopAdapter}
 *
 * @param		{DocloopCore} 		core
 * @param		{Object}		 	config											Configuration object 
 * @param		{String}			home											Website of the used paperhive instance.
 * @param		{String}			contentLink										Url of paperhive doument's discussion. Use %s in this string to indicate the positin of the document's id.
 * @param 		{Boolean} 			extraEndpoints									True iff there are addtional non privileged endpoints.
 * @param 		{Number} 			scanningInterval								Time between two scans in milliseconds.
 * 
 * @property 	{Object} 			endpointDefaultConfig
 * @property 	{Object} 			endpointDefaultConfig.includePastAnnotations	If set to true, the adapter will collect all annotations from a source, 
 * 																	as soon as a link is established. This might be undesirable for documents with a 
 * 																	large amount of annotations.
 */
class PaperhiveAdapter extends DocLoopAdapter {

	constructor(core, config){

		super(core, {

			...config, 

			id:						'paperhive',
			type:					'source',
			endpointClass:			PaperhiveSource,
			endpointDefaultConfig:	{
										includePastAnnotations: 	true,
									}
		})

		this.id 	= 'paperhive'
		this.config = config

		this.core.on('link-established', this.handleLinkEstablishedEvent.bind(this) )

		this.core.on('link-removed', link => {
			console.log('### link removed', link.id)
		})

		this.core.ready
		.then( () => {
			setInterval(this.scanSources.bind(this), this.config.scanningInterval || 6*60*60*1000) 
		})

	}

	/**
	 * If the source matches this adapter it will be scanned for annotations and replies.
	 * @param  {DocloopLink.skeleton}
	 * @return {undefined}
	 * @listens link-established
	 */
	async handleLinkEstablishedEvent(link){

		if(!link || !link.source || !link.source.adapter == this.id) return null

		var source = await this.getStoredEndpoint(link.source.id)

		source.scan()
	}

	/**
	 * Scan all stored source for new annotations or replies
	 * @return {undefined}
	 */
	async scanSources(){
		//TODO: spread events? Dont handle all of them at the same time...

		var sources = await this.getStoredEndpoints()

		sources.forEach( source => source.scan() )
	}

	/**
	 * There are no privileged endpoints. This Adapter only uses public paperhive documents.
	 * 
	 * @return {[type]}         [description]
	 */
	async getEndpoints(){
		return []
	}

	/**
	 * There are no privileged endpoints. This Adapter only uses public paperhive documents.
	 * 
	 * @return {[type]}         [description]
	 */
	async getStoredEndpoints(session_data){
		return []
	}


}

module.exports = {PaperhiveAdapter, PaperhiveSource}