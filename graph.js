var data = {};		// { utime: ..., time: ..., id: ..., players: ..., val: ... }
var ref = {};		// ref[utime] = players -- \\N for getting percentage by cube()

var grmin, grmax;

function graphstat()	{

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

		// fill missed points with zeroes
		Object.keys(data).forEach( id => {
			for(utime = grmin.valueOf()/1000 + 3600; utime < grmax.valueOf()/1000; utime += 3600)	{
				if( ! data[id].find( d => +d.utime === utime ))	{
					data[id].push({ utime: utime, time: new Date(utime * 1000), players: 0 });
				}
			}
			data[id].sort( (a,b) => (a.time - b.time) );
		});

		setvals( filters.find( d => d.name === 'graph' ) );
		drawgraph(f);

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
	var color = d3.scaleOrdinal(Object.keys(data), d3.schemeObservable10);

	svg.selectAll(".xaxis")
		.call( xaxis );

	svg.selectAll(".yaxis")
		.call( yaxis );

	svg.selectAll(".line")
	.data(Object.keys(data))
	.join(enter => {
		enter.append("path")
			.attr("class", "line")
			.attr("fill", "none")
			.attr("stroke", id => color(id))
			.attr("d", id => d3.line(d => x(d.time), d => y(d.val) )(data[id]));
	}, update => {
		update
			.attr("stroke", id => color(id))
			.attr("d", id => d3.line(d => x(d.time), d => y(d.val) )(data[id]));
	}, exit => {
		exit.remove();
	});

	console.log(data);
	console.log('redraw');

}
