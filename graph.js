var data = {};		// { utime: ..., time: ..., id: ..., players: ..., val: ... }
var ref = {};		// ref[utime] = players -- \\N for getting percentage by cube()

var grmin, grmax;

function graphstat()	{

	console.log(data);
	[grmin, grmax] = d3.extent(Array.prototype.flat.call(Object.keys(data).map(d => data[d].map(e => e.time))));

	d3.select("#graph0").text(grmin.toLocaleString().slice(0,17));
	d3.select("#graph1").text(grmax.toLocaleString().slice(0,17));

}

function timegraph(f)	{

	fetch("api/gettsv.php?f=gettimegraph" + makereqstr() + "&subj=" + f.name)
	.then( res => res.text() )
	.then( res => {

		
		Object.keys(data).forEach(key => delete data[key]);

		res.split('\n').forEach( s => {

			if(s.length === 0)
				return;

			var row = s.split('\t');

			if( row[1] === '\\N' )
				ref[row[0]] = +row[2];
			else	{
				data[row[1]] ??= [];
				data[row[1]].push({ utime: row[0], time: new Date(+row[0] * 1000), players: +row[2] });
			}

		});

		graphstat();
		setvals( filters.find( d => d.name === 'graph' ) );
		drawgraph(f);
		console.log(data);

	});

}

function drawgraph(f)	{

	var div = d3.select("#linechart");
	var svg = div.select("svg");

		const margin = { top: 10, right: 30, bottom: 30, left: 60},
			width = div.node().clientWidth - margin.left - margin.right,
			height = div.node().clientHeight - margin.top - margin.bottom;

	if(svg.empty())		{

		svg = div.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			.append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);

		svg.append("g")
			.attr("class", "xaxis")
			.attr("transform", `translate(0, ${height})`);

		svg.append("g")
			.attr("class", "yaxis");

	}
	
	var x = d3.scaleTime( [ grmin, grmax ], [ 0, width ] );
	var y = d3.scaleLinear( [ 0, d3.max(Array.prototype.flat.call(Object.keys(data).map(d => data[d].map(e => e.val)))) ], [ height, 0 ]);

	var xaxis = d3.axisBottom().scale(x);
	var yaxis = d3.axisLeft().scale(y).tickFormat(d3.format( percflag ? ".0%" : ".3~s"));

	svg.selectAll(".xaxis")
		.call( xaxis );

	svg.selectAll(".yaxis")
		.call( yaxis );

	svg.selectAll(".line")
	.data(data)
	.join(enter => {
		enter.append("path")
			.attr("class", "line")
			.attr("fill", "none")
			.attr("stroke", "red")
			.attr("d", p => d3.line( d => x(d.time), d => y(d.val) )());
	}, update => {
	}, exit => {
		exit.remove();
	});

	console.log(data);
	console.log('redraw');

}
