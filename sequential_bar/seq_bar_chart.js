// NOTE: Referenced http://bl.ocks.org/zwang155/5079c689233607dd9bdd28d4e39fb290
//                  https://d3-legend.susielu.com/


// set the dimensions and margins of the graph
const SCREEN_DIMENSIONS = { 
    width: 600,
    height: 600,
    leftMargin: 30,
    rightMargin: 115,
    topMargin: 10,
    bottomMargin: 100,
    cellPadding: 20
};
SCREEN_DIMENSIONS.innerWidth = SCREEN_DIMENSIONS.width - SCREEN_DIMENSIONS.leftMargin - SCREEN_DIMENSIONS.rightMargin;
SCREEN_DIMENSIONS.innerHeight = SCREEN_DIMENSIONS.height - SCREEN_DIMENSIONS.topMargin - SCREEN_DIMENSIONS.bottomMargin;

const DATA_LOC = '../data/share-elec-produc-by-source.csv';
const MIN_YEAR = 2010,
        MAX_YEAR = 2020;
const TARGET_ENTITY = 'United States'

// append the svg object to the body of the page
var svg = d3.select('body').append('svg')
    .attr('width', SCREEN_DIMENSIONS.width)
    .attr('height', SCREEN_DIMENSIONS.height)
    .attr("viewBox", [-SCREEN_DIMENSIONS.leftMargin, -SCREEN_DIMENSIONS.topMargin, 
                        SCREEN_DIMENSIONS.width, SCREEN_DIMENSIONS.height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

const columnTranslations = new Map([
    ['Year', 'year'],
    ["Hydro (% electricity)", "hydro"],
    ["Solar (% electricity)", "solar"],
    ["Wind (% electricity)", "wind"],
    ["Other renewables (% electricity)", "other"],
    ['Oil (% electricity)', 'oil']
]);


const xParams = {
    value: row => row.year,
    label: 'Year',
    scale: d3.scaleBand(),
    tickPadding: 5
};
xParams.axis = d3.axisBottom()
    .scale(xParams.scale)
    .tickPadding(xParams.tickPadding)
    .tickSize(-SCREEN_DIMENSIONS.innerHeight);

const yParams = {
    value: row => row.solar,
    label: 'Solar Electricity Production per Capita (%)',
    scale: d3.scaleLinear(),
    tickPadding: 5
};
yParams.axis = d3.axisLeft()
    .scale(yParams.scale)
    .tickPadding(yParams.tickPadding)
    .tickFormat(d3.format('.1f'))
    .tickSize(-SCREEN_DIMENSIONS.innerWidth)


const colorParams = {
    value: row => row.oil
} 

const canvas = svg.append('g')
    .attr('transform', `translate(${SCREEN_DIMENSIONS.leftMargin},${SCREEN_DIMENSIONS.topMargin})`);

const xAxisGroup = canvas.append('g')
    .attr('transform', `translate(0, ${SCREEN_DIMENSIONS.innerHeight})`);

const yAxisGroup = canvas.append('g');

const titleGroup = canvas.append("text")
    .attr('transform', `translate(${(SCREEN_DIMENSIONS.innerWidth / 2)},${0 - (SCREEN_DIMENSIONS.topMargin * 1.35)})`)
    .attr("class", "title")
    .text("US Energy Production (Solar vs. Oil) 2010-2020");

const legendGroup = canvas.append('g')
    .attr("transform", `translate(${SCREEN_DIMENSIONS.innerWidth + SCREEN_DIMENSIONS.rightMargin / 5},${SCREEN_DIMENSIONS.topMargin * 2})`)
    .attr("class", "legendSequential");

xAxisGroup.append('text')
    .attr('class', 'x-axis-label')
    .attr('x', SCREEN_DIMENSIONS.innerWidth / 2)
    .attr('y', 50)
    .text(xParams.label);

yAxisGroup.append('text')
    .attr('class', 'y-axis-label')
    .attr('x', -SCREEN_DIMENSIONS.topMargin * 5.5)
    .attr('y', -SCREEN_DIMENSIONS.leftMargin * 1.75)
    .text(yParams.label);


const preprocess = (row, i) => {

    // Know there are no null-values from preprocessing
    let filtered = d => { 
        let yr = parseFloat(d['Year']) 
        return row['Entity'] != TARGET_ENTITY || yr < MIN_YEAR || yr > MAX_YEAR
    };

    return !filtered(row) ? Object.fromEntries(
        Array.from(columnTranslations.entries())
            .map(([key, val]) => [val, parseFloat(row[key])])
    ) : null;
};

d3.csv(DATA_LOC, preprocess).then((data, i) => {

    let xSeq = []
    data.forEach(elem => xSeq.push(xParams.value(elem)))

    let minY = d3.min(data, yParams.value)
    let maxY = d3.max(data, yParams.value)
    yParams.scale
        .domain([minY, maxY * (1.1)])
        .range([SCREEN_DIMENSIONS.innerHeight, 0]);
    
    xParams.scale
        .domain(xSeq)
        .range([0, SCREEN_DIMENSIONS.innerWidth]).padding(0.45)
    
    let minColorVal = d3.min(data, colorParams.value)
    let maxColorVal = d3.max(data, colorParams.value)
    var colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([minColorVal, maxColorVal])

    canvas.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xParams.scale(xParams.value(d)))
        .attr('y', d => yParams.scale(yParams.value(d)))
        .attr('width', xParams.scale.bandwidth())
        .attr('height', d => SCREEN_DIMENSIONS.innerHeight - yParams.scale(yParams.value(d)))
        .attr('fill', d => colorScale(colorParams.value(d)))

    
    // Draw axis
    xAxisGroup.call(xParams.axis);
    yAxisGroup.call(yParams.axis);


    // Define and build legend
    var legend = d3.legendColor()
        .shapeHeight(15)
        .cells(10)
        .orient("vertical")
        .ascending(true)
        .scale(colorScale) 
        .title("% Oil Production")
        .titleWidth(30);

    legendGroup.call(legend);
});

