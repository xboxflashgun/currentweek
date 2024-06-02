function timegraph(f)	{

	console.log(f,makereqstr());

	fetch("api/gettsv.php?f=gettimegraph" + makereqstr() + "&subj=" + f.name)
	.then( res => res.text() )
	.then( res => {

		var data = [];

		res.split('\n').forEach( s => {

			if(s.length === 0)
				return;

			var row = s.split('\t');

			data.push( { time: new Date(+row[0] * 1000), id: row[1], players: +row[2] } );

		});

		console.log(data);

		var div = d3.select("#gametab");
		var svg = div.select("svg");

		if(svg.empty())		{

			const margin = { top: 10, right: 30, bottom: 30, left: 60},
				width = div.node().clientWidth - margin.left - margin.right,
				height = div.node().clientHeight - margin.top - margin.bottom;

			svg = d3.select("#gametab").append("svg")
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
				.append("g")
					.attr("transform", `translate(${margin.left},${margin.top})`);

			var x = d3.scaleTime( d3.extent( data, d => d.time ), [ 0, width ] );
			
		}	

	});

}
