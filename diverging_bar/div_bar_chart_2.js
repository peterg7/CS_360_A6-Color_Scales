// NOTE: Referenced https://observablehq.com/@d3/diverging-stacked-bar-chart
//                  https://bl.ocks.org/tlfrd/187e45e0629711c4560cf6bcd0767b27

/**********************
 ***    Constants   ***
 **********************/

// set the dimensions and margins of the graph
const SCREEN_DIMENSIONS = { 
    width: 600,
    height: 500,
    leftMargin: 30,
    rightMargin: 135,
    topMargin: 20,
    bottomMargin: 150,
    cellPadding: 20
};
SCREEN_DIMENSIONS.innerWidth = SCREEN_DIMENSIONS.width - SCREEN_DIMENSIONS.leftMargin - SCREEN_DIMENSIONS.rightMargin;
SCREEN_DIMENSIONS.innerHeight = SCREEN_DIMENSIONS.height - SCREEN_DIMENSIONS.topMargin - SCREEN_DIMENSIONS.bottomMargin;

const TITLE_TEXT = "2010 Sampling of Country's Energy Usage";
const DATA_LOC = '../data/transformed/generated_consumption_production_by_source.csv';

// Control parameters
const NUM_COUNTRIES = 10;
const MIN_YEAR = 2010,
        MAX_YEAR = 2020;

// append the svg object to the body of the page
var svg = d3.select('body').append('svg')
    .attr('width', SCREEN_DIMENSIONS.width)
    .attr('height', SCREEN_DIMENSIONS.height)
    .attr("viewBox", [-SCREEN_DIMENSIONS.leftMargin, -SCREEN_DIMENSIONS.topMargin, 
                        SCREEN_DIMENSIONS.width, SCREEN_DIMENSIONS.height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

const columnTranslations = new Map([
    ['entity', 'country'],
    ['year', 'year'],
    ['cp_ratio', 'cp_ratio'],
    ['cp_ratio_relative_to_source', 'cp_ratio_relative_to_source'],
    ['source', 'source'],
    ['renewable', 'renewable'],
    ['consumption_relative_to_source', 'consumption_relative_to_source'],
    ['production_relative_to_source', 'production_relative_to_source']
]);


/**********************
 * Feature parameters *
 **********************/

const xParams = {
    value: row => row.cp_ratio_relative_to_source,
    label: 'Ratio of Energy Consumption to Production',
    scale: d3.scaleLinear(),
    tickPadding: 4
};
xParams.axis = d3.axisBottom()
    .scale(xParams.scale)
    .tickSizeOuter(0);

const yParams = {
    value: row => row.country,
    label: 'Country',
    scale: d3.scaleBand(),
    tickPadding: 5
};

const colorParams = {
    value: row => row.production_relative_to_source,
    label1: "Relative Production of",
    label2: "Renewable Energy",
    pre_scale: d3.scaleLinear().range([0, 1])
}
colorParams.colorMap = x => d3.scaleDiverging(d3.interpolateRdYlGn)(colorParams.pre_scale(x))

/******************
 * Graphic groups *
 ******************/

const groupTranslations = {
    'canvas': `translate(${SCREEN_DIMENSIONS.leftMargin},${SCREEN_DIMENSIONS.topMargin})`,
    'xAxis': `translate(0, ${SCREEN_DIMENSIONS.innerHeight})`,
    'title': `translate(${(SCREEN_DIMENSIONS.innerWidth / 2)},${0 - (SCREEN_DIMENSIONS.topMargin * 1.35)})`,
    'legend': `translate(${SCREEN_DIMENSIONS.innerWidth + SCREEN_DIMENSIONS.rightMargin / 5},${SCREEN_DIMENSIONS.topMargin * 2})`
}


const canvas = svg.append('g')
                    .attr('transform', groupTranslations.canvas);

const xAxisGroup = canvas.append('g')
                            .attr('class', 'x-axis')
                            .attr('transform', groupTranslations.xAxis)

const yAxisGroup = canvas.append('g')
                            .attr('class', 'y-axis');


const titleGroup = canvas.append("text")
                            .attr('transform', groupTranslations.title)
                            .attr("class", "title")
                            .text(TITLE_TEXT);

// Append a linearGradient element 
var linearGradient = canvas.append("linearGradient")
                            .attr("id", "linear-gradient");

linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");


var bars = canvas.append("g")
    .attr("class", "bars")

var barLabels = canvas.append("g")
    .attr("class", "labels");

xAxisGroup.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', SCREEN_DIMENSIONS.innerWidth / 2)
        .attr('y', 50)
        .text(xParams.label)

/*********************
 * Data manipulation *
 *********************/

const preprocess = (row, i) => {
    let filtered = d => { 
        let yr = parseInt(d['year']) 
        return Object.values(d).includes(null) ||
                    d['source'] != 'agg_renew' ||
                    yr != 2010
    };
    return !filtered(row) ? Object.fromEntries(
        Array.from(columnTranslations.entries())
            .map(([key, val]) => {
                if (['entity', 'source', 'renewable'].includes(key))
                    return [val, row[key]]
                return [val, parseFloat(row[key])]
            })
    ) : null;
};

const groupBy = (xs, key) => {
    return xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

d3.csv(DATA_LOC, preprocess).then((data, i) => {

    countryGroups = groupBy(data, 'country');

    // Shuffle array to get random values
    const shuffledCountries = Object.keys(countryGroups).sort(() => 0.5 - Math.random());
    let randomCountries = shuffledCountries.slice(0, Math.min(shuffledCountries.length, NUM_COUNTRIES));
    let sampleData = data.filter(a => randomCountries.includes(a.country))
    let groupedSampleData = groupBy(sampleData, 'country')

    console.log(sampleData)
    console.log(groupedSampleData)

    
    xParams.scale.domain(d3.extent(sampleData, xParams.value))
                    .range([0, SCREEN_DIMENSIONS.innerWidth]);

    yParams.scale.domain(sampleData.map(yParams.value))
                    .range([SCREEN_DIMENSIONS.innerHeight, 0])
                    .padding(0.1);

    let minColor = d3.min(sampleData, colorParams.value)
    let maxColor = d3.max(sampleData, colorParams.value)
    colorParams.pre_scale.domain([minColor, maxColor])

    

    // Set legend colors
    linearGradient.selectAll("stop")
        .data([
            {offset: "0%", color: colorParams.colorMap(minColor)},
            {offset: "25%", color: colorParams.colorMap(((maxColor - minColor) / 4) + minColor)},
            {offset: "50%", color: colorParams.colorMap(((maxColor - minColor) / 2) + minColor)},
            {offset: "75%", color: colorParams.colorMap(((maxColor - minColor) / 4) - maxColor)},
            {offset: "100%", color: colorParams.colorMap(maxColor)}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);


    bars.selectAll("rect")
        .data(sampleData)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", d => xParams.scale(Math.min(0, xParams.value(d))))
            .attr("y", d => yParams.scale(yParams.value(d)))
            .attr("height", yParams.scale.bandwidth())
            .attr("width", d => Math.abs(xParams.scale(xParams.value(d)) - xParams.scale(0)))
            .style("fill", d => colorParams.colorMap(colorParams.value(d)));
        

    barLabels.selectAll("text")
        .data(sampleData)
        .enter()
        .append("text")
            .attr("class", "bar-label")
            .attr("x", xParams.scale(0))
            .attr("y", d => yParams.scale(yParams.value(d)) - yParams.scale.bandwidth()/2)
            .attr("dx", d => xParams.value(d) < 0 ? xParams.tickPadding : -xParams.tickPadding)
            .attr("dy", yParams.scale.bandwidth())
            .attr("text-anchor", d => xParams.value(d) < 0 ? "start" : "end")
            .text(d => yParams.value(d))


    yAxisGroup.attr("transform", "translate(" + xParams.scale(0) + ",0)")
                .append("line")
                    .attr("y1", 0)
                    .attr("y2", SCREEN_DIMENSIONS.innerHeight);

    xAxisGroup.call(xParams.axis);

    /** Couldn't find documentation for Susie Lu w/ Diverging Scale
    // Define and build legend
    var legend = d3.legendColor()
        .shapeHeight(15)
        .cells(10)
        .orient("vertical")
        .ascending(true)
        .scale(colorParams.scale) 
        .title("% Oil Production")
        .titleWidth(30);

    legendGroup.call(legend);
    */

    // Draw the rectangle and fill with gradient
    let legend = canvas.append("g")
        .attr("class", "legend-tick")
        .attr("transform", "translate(" + SCREEN_DIMENSIONS.innerWidth * 1.1 + "," + SCREEN_DIMENSIONS.topMargin * 1.5 +")")
        
    legend.append("rect")  
        .attr("width", 25)
        .attr("height", 120)
        .style("fill", "url(#linear-gradient)");

    // Add Legend ticks
    let legendTicks = ['Least', 'Avgerage', 'Most']
    let yIncrement = 118 / 2;
    legendTicks.forEach((tick, i) => {
        legend.append("line")
                .attr("class", "legend-tick")
                .attr("x1", 25)
                .attr("y1", 1 + yIncrement * i)
                .attr("x2", 32)
                .attr("y2", 1 + yIncrement * i)
                
        legend.append("text")
                .attr("class", "legend-label")
                .attr("x", 35)
                .attr("y", 2 + yIncrement * i)
                .text(tick)
    })

    // Add legend title
    legend.append("text")
            .attr("class", "legend-title")
            .attr("x", -35)
            .attr("y", -20)
            .attr("width", 20)
            .text(colorParams.label1)
    legend.append("text")
            .attr("class", "legend-title")
            .attr("x", -30)
            .attr("y", -10)
            .attr("width", 20)
            .text(colorParams.label2)

});



