// NOTE: Referenced https://observablehq.com/@d3/diverging-stacked-bar-chart
//                  https://bl.ocks.org/tlfrd/187e45e0629711c4560cf6bcd0767b27


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

const NUM_COUNTRIES = 10;
const DATA_LOC = '../data/generated_consumption_production_by_source.csv';
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
    ['Entity', 'country'],
    ['Year', 'year'],
    ['footprint_ratio', 'footprint'],
    ['source', 'source']
]);


/**
 * LAYOUT/OVERVIEW
 * 
 * x -> fooprint_ratio
 * y -> Entity (country)
 * z (color) -> source
 */


const xParams = {
    value: row => row.footprint,
    label: 'Footprint (cons / prod)',
    // scale: d3.scaleBand(),
    tickPadding: 5
};
// xParams.axis = d3.axisBottom()
//     .scale(xParams.scale)
//     .tickPadding(xParams.tickPadding)
//     .tickFormat(d3.format('+%'))
//     .tickSize(-SCREEN_DIMENSIONS.innerHeight);

const yParams = {
    value: row => row.country,
    label: 'Country',
    // scale: d3.scaleLinear(),
    tickPadding: 5
};
// yParams.axis = d3.axisLeft()
//     .scale(yParams.scale)
//     .tickPadding(yParams.tickPadding)
//     .tickFormat(d3.format('.2f'))
//     .tickSize(-SCREEN_DIMENSIONS.innerWidth)


const colorParams = {
    value: row => row.source
} 

const colorArray = d3.schemeTableau10;
const stackOffset = d3.stackOffsetDiverging // stack offset method
const stackOrder = (series) => { // stack order method; try also d3.stackOffsetNone
    return [ // by default, stack negative series in reverse order
        ...series.map((S, i) => S.some(([, y]) => y < 0) ? i : null).reverse(),
        ...series.map((S, i) => S.some(([, y]) => y < 0) ? null : i)
    ].filter(i => i !== null);
}

const canvas = svg.append('g')
    .attr('transform', `translate(${SCREEN_DIMENSIONS.leftMargin},${SCREEN_DIMENSIONS.topMargin})`);

// const xAxisGroup = canvas.append('g')
//     .attr('transform', `translate(0, ${SCREEN_DIMENSIONS.innerHeight})`);

// const yAxisGroup = canvas.append('g');

// const titleGroup = canvas.append("text")
//     .attr('transform', `translate(${(SCREEN_DIMENSIONS.innerWidth / 2)},${0 - (SCREEN_DIMENSIONS.topMargin * 1.35)})`)
//     .attr("class", "title")
//     .text("US Energy Production (Solar vs. Oil) 2010-2020");

// const legendGroup = canvas.append('g')
//     .attr("transform", `translate(${SCREEN_DIMENSIONS.innerWidth + SCREEN_DIMENSIONS.rightMargin / 5},${SCREEN_DIMENSIONS.topMargin * 2})`)
//     .attr("class", "legendSequential");

// xAxisGroup.append('text')
//     .attr('class', 'x-axis-label')
//     .attr('x', SCREEN_DIMENSIONS.innerWidth / 2)
//     .attr('y', 50)
//     .text(xParams.label);

// yAxisGroup.append('text')
//     .attr('class', 'y-axis-label')
//     .attr('x', -SCREEN_DIMENSIONS.topMargin * 5.5)
//     .attr('y', -SCREEN_DIMENSIONS.leftMargin * 1.75)
//     .text(yParams.label);


const preprocess = (row, i) => {
    let filtered = d => { 
        let yr = parseInt(d['Year']) 
        return Object.values(d).includes(null) ||
                    yr < MIN_YEAR || yr > MAX_YEAR ||
                    Object.values(d).includes(-1) // represents infinity (invalid)
    };
    return !filtered(row) ? Object.fromEntries(
        Array.from(columnTranslations.entries())
            .map(([key, val]) => {
                if (['Entity', 'source'].includes(key))
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


    // Compute values.
    const X = d3.map(sampleData, xParams.value);
    const Y = d3.map(sampleData, yParams.value);
    const Z = d3.map(sampleData, colorParams.value);

    console.log(sampleData)


    let yDomain = new Set(d3.groupSort(sampleData, D => d3.sum(D, d => -Math.min(0, xParams.value(d))), d => yParams.value(d)))
    let zDomain = new Set(sampleData.map(a => a.source))



    // Omit any data not present in the y- and z-domains.
    const I = d3.range(X.length).filter(i => yDomain.has(Y[i]) && zDomain.has(Z[i]));


    

    
    // Compute a nested array of series where each series is [[x1, x2], [x1, x2],
    // [x1, x2], …] representing the x-extent of each stacked rect. In addition,
    // each tuple has an i (index) property so that we can refer back to the
    // original data point (data[i]). This code assumes that there is only one
    // data point for a given unique y- and z-value.
    const series = d3.stack()
        .keys(zDomain)
        .value(([, I], z) => X[I.get(z)])
        .order(stackOrder)
        .offset(stackOffset)
        (d3.rollup(I, ([i]) => i, i => Y[i], i => Z[i]))
        .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})));
    
    let xDomain = d3.extent(series.flat(2));

    // Compute the default y-domain. Note: diverging stacks can be negative.
    const xRange = [SCREEN_DIMENSIONS.leftMargin, SCREEN_DIMENSIONS.innerWidth - SCREEN_DIMENSIONS.rightMargin];
    const yRange = [SCREEN_DIMENSIONS.height - SCREEN_DIMENSIONS.bottomMargin, SCREEN_DIMENSIONS.topMargin];

    // Construct scales, axes, and formats.
    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleBand(yDomain, yRange).paddingInner(0.1);
    const colorScale = d3.scaleOrdinal(zDomain, colorArray);
    // const xAxis = d3.axisTop(xScale).ticks(SCREEN_DIMENSIONS.innerWidth / 80, xFormat);
    // const yAxis = d3.axisLeft(yScale).tickSize(0);

    // canvas.append("g")
    //     .attr("transform", `translate(0,${marginTop})`)
    //     .call(xAxis)
    //     .call(g => g.select(".domain").remove())
    //     .call(g => g.selectAll(".tick line").clone()
    //         .attr("y2", height - marginTop - marginBottom)
    //         .attr("stroke-opacity", 0.1))
    //     .call(g => g.append("text")
    //         .attr("x", xScale(0))
    //         .attr("y", -22)
    //         .attr("fill", "currentColor")
    //         .attr("text-anchor", "middle")
    //         .text(xLabel));

    const bar = canvas.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", ([{i}]) => colorScale(Z[i]))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", ([x1, x2]) => Math.min(xScale(x1), xScale(x2)))
        .attr("y", ({i}) => yScale(Y[i]))
        .attr("width", ([x1, x2]) => Math.abs(xScale(x1) - xScale(x2)))
        .attr("height", yScale.bandwidth());

    // if (title) bar.append("title")
    //     .text(({i}) => title(i));

    // canvas.append("g")
    //     .attr("transform", `translate(${xScale(0)},0)`)
    //     .call(yAxis)
    //     .call(g => g.selectAll(".tick text")
    //         .attr("dx", -3)
    //         .attr("x", y => { // Find the minimum x-value for the corresponding y-value.
    //             const x = d3.min(series, S => S.find(d => Y[d.i] === y)?.[0]);
    //             return xScale(x) - xScale(0);
    //         }));

    xAxisGroup.call(xParams.axis);
    yAxisGroup.call(yParams.axis);
});



// function StackedBarChart(data, {
//     x = d => d, // given d in data, returns the (quantitative) x-value
//     y = (d, i) => i, // given d in data, returns the (ordinal) y-value
//     z = () => 1, // given d in data, returns the (categorical) z-value
//     title, // given d in data, returns the title text
//     marginTop = 30, // top margin, in pixels
//     marginRight = 0, // right margin, in pixels
//     marginBottom = 0, // bottom margin, in pixels
//     marginLeft = 40, // left margin, in pixels
//     width = 640, // outer width, in pixels
//     height, // outer height, in pixels
//     xType = d3.scaleLinear, // type of x-scale
//     xDomain, // [xmin, xmax]
//     xRange = [marginLeft, width - marginRight], // [left, right]
//     yDomain, // array of y-values
//     yRange, // [bottom, top]
//     yPadding = 0.1, // amount of y-range to reserve to separate bars
//     zDomain, // array of z-values
//     offset = d3.stackOffsetDiverging, // stack offset method
//     order = (series) => { // stack order method; try also d3.stackOffsetNone
//       return [ // by default, stack negative series in reverse order
//         ...series.map((S, i) => S.some(([, y]) => y < 0) ? i : null).reverse(),
//         ...series.map((S, i) => S.some(([, y]) => y < 0) ? null : i)
//       ].filter(i => i !== null);
//     },
//     xFormat, // a format specifier string for the x-axis
//     xLabel, // a label for the x-axis
//     colors = d3.schemeTableau10, // array of colors
//   } = {})








// // If the height is not specified, derive it from the y-domain.
// if (height === undefined) height = yDomain.size * 25 + marginTop + marginBottom;
// if (yRange === undefined) yRange = [height - marginBottom, marginTop];
