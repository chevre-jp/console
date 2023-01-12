var aggregations = [];
var aggregateOrders = [];
var searchedAllAggregations = false;
var searchedAllAggregationOrders = false;
var limit = 100;
var page = 0;
var page4aggregateOrder = 0;

$(function () {
    searchAggregations(function () {
        console.log('creating charts...', aggregations.length, 'aggregations');
        showReservationsBarChart();
    });
    searchOrderAggregations(function () {
        console.log('creating charts...', aggregations.length, 'aggregations');
        showOrdersBarChart();
        showAcceptedOfferCountBarChart();
    });
});

function showOrdersBarChart() {
    var datas = aggregateOrders.sort(function (a, b) {
        return moment(a.aggregateStart).unix() - moment(b.aggregateStart).unix();
    })
        .reduce(
            (a, b) => {
                var xValue = moment(b.aggregateStart)
                    .toISOString();
                var existingData = a.find((data) => data.x === xValue);
                if (existingData !== undefined) {
                    existingData.y += 1;
                } else {
                    a.push({
                        x: xValue,
                        y: b.orderCount,
                    });
                }

                return a;
            },
            [
            ],
        );
    createOrderAggregationsBarChart(datas);
}

function showAcceptedOfferCountBarChart() {
    var datas = aggregateOrders.sort(function (a, b) {
        return moment(a.aggregateStart).unix() - moment(b.aggregateStart).unix();
    })
        .reduce(
            (a, b) => {
                var xValue = moment(b.aggregateStart)
                    .toISOString();
                var existingData = a.find((data) => data.x === xValue);
                if (existingData !== undefined) {
                    existingData.y += 1;
                } else {
                    a.push({
                        x: xValue,
                        y: b.acceptedOfferCount,
                    });
                }

                return a;
            },
            [
            ],
        );
    createAcceptedOfferCountBarChart(datas);
}

function showReservationsBarChart() {
    var datas = aggregations.sort(function (a, b) {
        return moment(a.aggregateStart).unix() - moment(b.aggregateStart).unix();
    })
        .reduce(
            (a, b) => {
                var xValue = moment(b.aggregateStart)
                    .toISOString();
                var existingData = a.find((data) => data.x === xValue);
                if (existingData !== undefined) {
                    existingData.y += 1;
                } else {
                    a.push({
                        x: xValue,
                        y: b.reservationCount,
                    });
                }

                return a;
            },
            [
            ],
        );
    createAggregationsBarChart(datas);
}

function searchOrderAggregations(cb) {
    page4aggregateOrder += 1;
    $.getJSON(
        '/aggregations?format=datatable',
        {
            limit: limit,
            page: page4aggregateOrder,
            typeOf: 'AggregateOrder'
        }
    ).done(function (data) {
        searchedAllAggregationOrders = (data.results.length < limit);
        $.each(data.results, function (_, aggregation) {
            aggregateOrders.push(aggregation);
        });
        if (!searchedAllAggregationOrders) {
            searchOrderAggregations(cb);
        } else {
            // 件数表示
            // $('#orderCount').html(orders.length.toString());
            cb();
        }
    }).fail(function () {
        console.error('注文集計を検索できませんでした')
    });
}

function searchAggregations(cb) {
    page += 1;
    $.getJSON(
        '/aggregations?format=datatable',
        {
            limit: limit,
            page: page,
            typeOf: 'AggregateReservation'
        }
    ).done(function (data) {
        searchedAllAggregations = (data.results.length < limit);
        $.each(data.results, function (_, aggregation) {
            aggregations.push(aggregation);
        });
        if (!searchedAllAggregations) {
            searchAggregations(cb);
        } else {
            // 件数表示
            // $('#orderCount').html(orders.length.toString());
            cb();
        }
    }).fail(function () {
        console.error('予約集計を検索できませんでした')
    });
}

function createOrderAggregationsBarChart(datas) {
    console.log('creating bar chart...datas:', datas.length, datas);

    // This will get the first returned node in the jQuery collection.
    new Chart($('#aggregateOrderBarChart').get(0).getContext('2d'), {
        type: 'bar',
        data: {
            // labels: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2', '2012 Q3', '2012 Q4', '2013 Q1', '2013 Q2'],
            datasets: [
                {
                    // backgroundColor: '#efefef',
                    // borderColor: '#efefef',
                    borderWidth: 1,
                    data: datas.map(function (data) {
                        return { x: moment(data.x).toDate(), y: data.y }
                    })
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: 'orderCount'
            },
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    unit: 'day',
                    gridLines: {
                        display: false
                    }

                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                    },
                }]
            }
        }
    });
}

function createAcceptedOfferCountBarChart(datas) {
    console.log('creating bar chart...datas:', datas.length, datas);

    // This will get the first returned node in the jQuery collection.
    new Chart($('#acceptedOfferCountBarChart').get(0).getContext('2d'), {
        type: 'bar',
        data: {
            // labels: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2', '2012 Q3', '2012 Q4', '2013 Q1', '2013 Q2'],
            datasets: [
                {
                    // backgroundColor: '#efefef',
                    // borderColor: '#efefef',
                    borderWidth: 1,
                    data: datas.map(function (data) {
                        return { x: moment(data.x).toDate(), y: data.y }
                    })
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: 'acceptedOffers'
            },
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    unit: 'day',
                    gridLines: {
                        display: false
                    }

                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                    },
                }]
            }
        }
    });
}

function createAggregationsBarChart(datas) {
    console.log('creating bar chart...datas:', datas.length, datas);

    // This will get the first returned node in the jQuery collection.
    new Chart($('#aggregationsBarChart').get(0).getContext('2d'), {
        type: 'bar',
        data: {
            // labels: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2', '2012 Q3', '2012 Q4', '2013 Q1', '2013 Q2'],
            datasets: [
                {
                    // backgroundColor: '#efefef',
                    // borderColor: '#efefef',
                    borderWidth: 1,
                    data: datas.map(function (data) {
                        return { x: moment(data.x).toDate(), y: data.y }
                    })
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: 'reservationCount'
            },
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    unit: 'day',
                    gridLines: {
                        display: false
                    }

                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                    },
                }]
            }
        }
    });
}
