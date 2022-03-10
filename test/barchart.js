var svg = d3.select("svg"),
    margin = 200,
    width = svg.attr("width") - margin,
    height = svg.attr("height") - margin


var g = svg.append("g")
    .attr("transform", "translate(" + 100 + "," + 100 + ")");


//https://www.w3schools.com/js/js_random.asp
function getRndInteger(min, max) {
    var ranNum = Math.floor(Math.random() * (max - min) ) + min
    if(ranNum == 0){
        ranNum = getRndInteger(min, max) ;
    }
    return ranNum;
}


d3.csv("https://raw.githubusercontent.com/Alex-Ignus/cs360-a2-DV/main/videogames_NDSsold2008byconsole.csv")
    .row(function (d) { return { SalesYear:Number(d.Year),TotalReleases:Number(d.Count) };})
    .get(function(error, data){

        var mxRelease = d3.max(data, d => d.TotalReleases);
        var xScale = d3.scaleBand()
            .domain(data.map(d => d.SalesYear))
            .range([0, width]).padding(0.4);
        console.log(mxRelease)
        var yScale = d3.scaleLinear()
            .domain([0,mxRelease])
            .range([height, 0]);

        var color = colorbrewer.Greens["5"]
        var colorScale = d3.scaleOrdinal()
            .domain(data.map(d => d.SalesYear))
            .range(color)

        g.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));
        g.append("g")
            .call(d3.axisLeft(yScale).tickFormat(function(d){
                return d;
            }).ticks(10))
            .append("text")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("value");
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return xScale(d.SalesYear); })
            .attr("y", function(d) { return yScale(d.TotalReleases); })
            .attr("width", xScale.bandwidth())
            .attr("height", function(d) { return height - yScale(d.TotalReleases); })
            .attr("fill", function(d, i) { return colorScale(i); });




    });