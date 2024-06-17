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
	
		// f.ref is here
		
		var sels = 0;	// get number of selections in 'genre' and 'game' filters
		filters.filter( d => d.name === 'genre' || d.name === 'game' ).map( d => sels += d.sels.size );

		if( (f.name === 'country' || f.name === 'genre') && sels > 0 )	{

			// calc over total gamers w/o filter

			var list = Object.keys(data).join(',');

			fetch("api/gettsv.php?f=gettimeref" + makereqstr() + "&subj=" + f.name + "&list=" + list)
			.then( res => res.text() )
			.then( res => {

				var ref = {};
				res.split('\n').forEach( s => {

					if(s.length === 0)
						return;

					var row = s.split('\t');
					// utime, subj, players
					ref[row[1]] ??= {};
					ref[row[1]][row[0]] = +row[2];

				});

				Object.keys(data).forEach( id => {
					data[id].forEach( p => {
	
						p.ref = ref[id][p.utime] ?? 0;
	
					});

				});
			
				graphstat();

				setvals( filters.find( d => d.name === 'graph' ) );
				drawgraph(f);

			});
			
		} else	{

			// calc over sum of list
			var ref = {};
			Object.keys(data).forEach( id => {
				data[id].forEach( p => {
	
			ref[p.utime] ??= 0;
					ref[p.utime] += p.players;
	
				});
			});

			Object.keys(data).forEach( id => {
				data[id].forEach( p => {
	
					p.ref = ref[p.utime];
	
				});
			});

			graphstat();

			setvals( filters.find( d => d.name === 'graph' ) );
			drawgraph(f);

		}

	});

}

var grsvg;

function drawgraph(f)	{

	var div = d3.select("#linechart");

	const margin = { top: 10, right: 10, bottom: 20, left: 40},
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
			.attr("pointer-events", "bounding-box")
			.attr("transform", `translate(0, ${height})`);
		grsvg.select(".xaxis").append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", "100%")
			.attr("height", "100%")
			.attr("fill", "none");

		grsvg.append("g")
			.attr("class", "yaxis");

	}
	
	var x = d3.scaleTime( [ grmin, grmax ], [ 0, width ] );	// .nice();
	var y = d3.scaleLinear( [ 0, d3.max(Array.prototype.flat.call(Object.keys(data).map(d => data[d].map(e => e.val)))) ], [ height, 0 ]);

	var xaxis = d3.axisBottom().scale(x);	// .ticks(28).tickFormat(d3.timeFormat("%H"));
	var yaxis = d3.axisLeft().scale(y).tickFormat(d3.format( percflag ? ".0%" : ".3~s"));
	var color = d3.scaleOrdinal(Object.keys(data), d3.schemeObservable10);

	grsvg.selectAll(".xaxis")
		.call( xaxis );

	grsvg.selectAll(".yaxis")
		.call( yaxis );

	const t = d3.transition().duration(750);
	
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
		update.call( s => s.transition(t)
			.attr("stroke", id => color(id))
			.attr("data-id", id => id)
			.attr("d", id => d3.line(d => x(d.time), d => y(d.val) )(data[id])));
	}, exit => {
		exit.remove();
	});

	var legend = d3.select("#legend")

	grsvg.select("rect").on("mouseout", e => {
		Object.keys(data).forEach( id => {
			legend.select(`tr[data-id="${id}"] td:nth-child(3)`).text("");
		});
		console.log(e);
	});
	
	grsvg.select("rect").on("mousemove", e => {
		console.log(e);
	});

	// Legend
	legend
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
		var date = x.invert(d3.pointer(e)[0]);
		var ind = data[id].findIndex( d => d.time > date );
		var d = data[id][ind];

		legend.select(".legendhead").text(d.time.toLocaleString().slice(0,17));
		Object.keys(data).forEach( id => {
			legend.select(`tr[data-id="${id}"] td:nth-child(3)`).text(data[id][ind].players);
		});

		d3.select(e.target).attr("stroke-width", 3);
		legend.select(`tr[data-id="${id}"]`).style("color", "#fff");

		tip.style("top", e.clientY - 61 + "px")
			.style("left", e.clientX + "px")
			.style("display", null)
		tip.html(`Date: ${d.time.toLocaleString().slice(0,17)}<br />Players: ${d.players}<br />${f.idname[id][0]}`);
		clearTimeout(to);

	})
	.on("mouseout", e => {

		var id = e.target.dataset.id;
		d3.select(e.target).attr("stroke-width", 1.5);
		legend.select(`tr[data-id="${id}"]`).style("color", "#999");
		to = setTimeout( () => tip.style("display", "none"), 2000)
		Object.keys(data).forEach( id => {
			legend.select(`tr[data-id="${id}"] td:nth-child(3)`).text("");
		});
		legend.select(".legendhead").text("Legend");

	});

	var myf = filters.find( d => d.name === d3.select('input[name="filter"]:checked').property("value"));
	d3.selectAll(".filtselected").classed("filtselected", false);
	d3.select("#" + myf.name + "div").classed("filtselected", true);

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
		row.append("td").text("");
	}, update => {
		update.select("td:nth-child(2)").call(s => s.transition(t).text(d => legendname(d) ));
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

	d3.select("#waiting").style("display", "none");

}
