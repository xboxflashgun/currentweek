function main()	{

	d3.select("#legend").style("display", "none");
	d3.select("#graphtip").style("display", "none");
	readalldata();
	d3.select("#" + d3.select('input[name="filter"]:checked').property("value") + "div").classed("filtselected", true);

}
