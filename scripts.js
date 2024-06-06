function main()	{

	d3.select("#legend").style("display", "none");
	d3.select("#graphtip").style("display", "none");
	var filt = d3.select('input[name="filter"]:checked').property("value");
	d3.select("#" + filt + "div").classed("tabsel", true);
	readalldata();

}
