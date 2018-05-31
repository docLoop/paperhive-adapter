# PaperhiveAdapter

This package is meant to be used with [docloop](https://github.com/docloop/core).

Install like this:

    npm install docloop-paperhive-adapter


Use like this (see [docloop](https://github.com/docloop/core)):

```javascript
var PaperhiveAdapter = require('docloop-paperhive-adapter').PaperhiveAdapter 

docloopCore
.use(PaperhiveAdapter,{
  name:             	"PaperHive",
  home:             	'https://paperhive.org',
  contentLink:			'https://paperhive.org/documents/items/%s',
  discussionsLink:		'https://paperhive.org/api/discussions?document=%s',
  documentLinkById:		'https://paperhive.org/api/document-items/by-document/%s',
  documentLinkByIemId:	'https://paperhive.org/api/document-items/%s',
  extraEndpoints:    	true,
  scanningInterval:  	60*60*1000
})
```

Here's the documentation: [docloopDocs](https://docloop.net/docs)