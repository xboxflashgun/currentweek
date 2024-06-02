function timegraph()	{

	console.log(graph, makereqstr());

	f = graph;		// current graph

	fetch("api/gettsv.php?f=gettimegraph" + makereqstr() + "&subj=" + f.name)
	.then( res => res.text() )
	.then( res => {

		console.log(res);

	});

}
