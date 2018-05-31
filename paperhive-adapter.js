'use strict'


var		DocLoopAdapter 	= 	require('docloop').DocloopAdapter,
		DocloopError	= 	require('docloop').DocloopError,
		PaperhiveSource	=	require('./paperhive-source.js'),
		request			=	require('request-promise-native').defaults({json:true}),
		Promise			=	require('bluebird')


/**
 * TODO: description!
 * @module  paperhiveAdapter
 * @license GPL-3.0
 * 
 */
		

/**
 * Adapter to harvest public annotations from paperhive.
 *
 * @alias		PaperhiveAdapter
 * @memberof 	module:paperhiveAdapter
 * 
 * @extends		{DocloopAdapter}
 *
 * @param		{DocloopCore} 		core
 * @param		{Object}		 	config											Configuration object 
 * @param		{String}			config.home										Website of the used paperhive instance.
 * @param		{String}			config.contentLink								Client Url of paperhive document. Use %s in this string to indicate the positin of the document's id.
 * @param		{String}			config.documentItemsById						Api Url of paperhive document items. Use %s in this string to indicate the positin of the document's id.
 * @param		{String}			config.documentItemByItemId						Api Url of paperhive document item. Use %s in this string to indicate the positin of the document's item id.
 * 
 * @param 		{Boolean} 			config.extraEndpoints							True iff there are addtional non privileged endpoints.
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



		//May generelize for all adapters
		var mandatory_config = 	{
										name:					true,
										home:					true,
										contentLink:			true,
										discussionsLink:		true,
										documentLinkByItemId:	true,
										documentLinkById:		true,
										extraEndpoints:			true,
										scanningInterval:		true
								}

		for(option in mandatory_config){
			if(this.config[option] === undefned) throw new Error("PaperhiveAdapter.constructor(): missing config:",option)
		}

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
	 * @return undefined
	 * @listens link-established
	 */
	async handleLinkEstablishedEvent(link){

		if(!link || !link.source || !link.source.adapter == this.id) return null

		var source = await this.getStoredEndpoint(link.source.id)

		source.scan()
	}

	/**
	 * Scan all stored source for new annotations or replies
	 * @return undefined
	 */
	async scanSources(){
		//TODO: spread events? Dont handle all of them at the same time...

		var sources = await this.getStoredEndpoints()

		sources.forEach( source => source.scan() )
	}

	/**
	 * There are no privileged endpoints. This Adapter only uses public paperhive documents.
	 * 
	 * @return {Array}         []
	 */
	async getEndpoints(){
		return []
	}

	/**
	 * There are no privileged endpoints. This Adapter only uses public paperhive documents.
	 * 
	 * @return {Array}         []
	 */
	async getStoredEndpoints(session_data){
		return []
	}


}

module.exports = {PaperhiveAdapter, PaperhiveSource}