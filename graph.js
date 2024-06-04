var data = {};		// { utime: ..., time: ..., id: ..., players: ..., val: ... ref: ... }

var grmin, grmax;

function graphstat()	{

	[grmin, grmax] = d3.extent(Array.prototype.flat.call(Object.keys(data).map(d => data[d].map(e => e.time))));

	d3.select("#graph0").text(grmin.toLocaleString().slice(0,17));
	d3.select("#graph1").text(grmax.toLocaleString().slice(0,17));

}

function timegraph(f)	{

	Object.keys(data).forEach(key => delete data[key]);

	fetch("api/gettsv.php?f=gettimegraph" + makereqstr() + "&subj=" + f.name)
	.then( res => res.text() )
	.then( res => {

		res.split('\n').forEach( s => {

			if(s.length === 0)
				return;

			var row = s.split('\t');
			// utime, subj, players

			data[row[1]] ??= [];
			data[row[1]].push({ utime: row[0], time: new Date(+row[0] * 1000), players: (row[2] === '\\N') ? 0 : +row[2] });

		});
	
		fetch("api/gettsv.php?f=gettimeref" + makereqstr() + "&subj=" + f.name)
		.then( res => res.text() )
		.then( res => {

			res.split('\n').forEach( s => {

				if(s.length === 0)
					return;

				var row = s.split('\t');
				// utime, subj, ref
				data[row[1]] ??= [];
				data[row[1]].find( d => d.utime === row[0]).ref = +row[2];

			});
		
			console.log(data);
			graphstat();

			setvals( filters.find( d => d.name === 'graph' ) );
			drawgraph(f);

		});


		// fill missed points with zeroes
//		Object.keys(data).forEach( id => {
//			for(utime = grmin.valueOf()/1000 + 3600; utime < grmax.valueOf()/1000; utime += 3600)	{
//				if( ! data[id].find( d => +d.utime === utime ))	{
//					data[id].push({ utime: utime.toString(), time: new Date(utime * 1000), players: 0 });
//					if( ! ref[utime.toString()] )
//						ref[utime.toString()] = 1;
//				}
//			}
//			data[id].sort( (a,b) => (a.time - b.time) );
//		});

	});

}

var grsvg;

function drawgraph(f)	{

	var div = d3.select("#linechart");

	const margin = { top: 10, right: 10, bottom: 30, left: 40},
		width = div.node().clientWidth - margin.left - margin.right,
		height = div.node().clientHeight - margin.top - margin.bottom;

	if(! grsvg)	{

		grsvg = div.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			.append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);

		grsvg.append("g")
			.attr("class", "xaxis")
			.attr("transform", `translate(0, ${height})`);

		grsvg.append("g")
			.attr("class", "yaxis");

	}
	
	var x = d3.scaleTime( [ grmin, grmax ], [ 0, width ] );
	var y = d3.scaleLinear( [ 0, d3.max(Array.prototype.flat.call(Object.keys(data).map(d => data[d].map(e => e.val)))) ], [ height, 0 ]);

	var xaxis = d3.axisBottom().scale(x);
	var yaxis = d3.axisLeft().scale(y).tickFormat(d3.format( percflag ? ".0%" : ".3~s"));
	var color = d3.scaleOrdinal(Object.keys(data), d3.schemeObservable10);

	grsvg.selectAll(".xaxis")
		.call( xaxis );

	grsvg.selectAll(".yaxis")
		.call( yaxis );

	grsvg.selectAll(".line")
	.data(Object.keys(data))
	.join(enter => {
		enter.append("path")
			.attr("class", "line")
			.attr("fill", "none")
			.attr("data-id", id => id)
			.attr("stroke", id => color(id))
			.attr("stroke-width", 1.5)
			.attr("d", id => d3.line(d => x(d.time), d => y(d.val) )(data[id]));
	}, update => {
		update
			.attr("stroke", id => color(id))
			.attr("data-id", id => id)
			.attr("d", id => d3.line(d => x(d.time), d => y(d.val) )(data[id]));
	}, exit => {
		exit.remove();
	});

	// Legend
	var legend = d3.select("#legend")
	.style("top", "230px")
	.style("left", "330px")
	.style("display", null)
	.call(d3.drag()
		.on("start", (e) => legend.style("cursor", "drag"))
		.on("drag", (e) => {
			legend.style("top", legend.node().offsetTop + e.dy + "px");
			legend.style("left", legend.node().offsetLeft + e.dx + "px");
		})
		.on("end", (e) => legend.style("cursor", "default"))
	);

	var tip = d3.select("#graphtip");
	var to;

	grsvg.selectAll(".line")
	.on("mouseover", e => {

		var id = e.target.dataset.id;
		d3.select(e.target).attr("stroke-width", 3);
		legend.select(`tr[data-id="${id}"]`).style("color", "#fff");

		var date = x.invert(d3.pointer(e)[0]);
		var d = data[id].find( d => d.time > date);
		tip.style("top", e.clientY - 42 + "px")
			.style("left", e.clientX + "px")
			.style("display", null)
		tip.html(`Date: ${d.time.toLocaleString().slice(0,17)}<br />Players: ${d.players}`);
		clearTimeout(to);

	})
	.on("mouseout", e => {

		var id = e.target.dataset.id;
		d3.select(e.target).attr("stroke-width", 1.5);
		legend.select(`tr[data-id="${id}"]`).style("color", "#999");
		to = setTimeout( () => tip.style("display", "none"), 2000)

	});

	var myf = filters.find( d => d.name === d3.select('input[name="filter"]:checked').property("value"));

	function legendname(d)	{

		if(! myf.idname)
			return "all gamers";
		if(myf.name === 'game')
			return myf.idname[d][0];

		return myf.idname[d][1];

	}

	legend.select("#legend table").selectAll("tr")
	.data(Object.keys(data))
	.join( enter => {
		var row = enter.append("tr");
		row.attr("data-id", d => d);
		row.append("td").html("&#x25a0;").style("color", id => color(id));
		row.append("td").text(d => legendname(d));
	}, update => {
		update.select("td:nth-child(2)").text(d => legendname(d) );
		update.attr("data-id", d => d);
	}, exit => {
		exit.remove();
	});

	legend.select("#legend table").selectAll("tr")
	.on("mouseover", e => {

		var id = e.target.parentNode.dataset.id;
		grsvg.selectAll(`path[data-id="${id}"]`)
			.attr("stroke", color(id))
			.attr("stroke-width", 3);
		d3.select(e.target.parentNode).style("color", "#fff");

	})
	.on("mouseout", e => {

		var id = e.target.parentNode.dataset.id;
		grsvg.selectAll(`path[data-id="${id}"]`)
			.attr("stroke", color(id))
			.attr("stroke-width", 1.5);
		d3.select(e.target.parentNode).style("color", "#999");

	});

}
