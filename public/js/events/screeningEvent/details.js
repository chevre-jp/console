
var eventByJson;
var offers = [];
var orders = [];
var reservations = [];
var searchedAllOrders = false;
var searchedAllReservations = false;
var limit = 10;
var page = 0;
var limit4reservations = 10;
var page4reservations = 0;
var remainingAttendeeCapacityChart;
var remainingAttendeeCapacityChart2;

$(function () {
    eventByJson = JSON.parse($('#jsonViewer textarea').val());

    // オファー集計
    console.log('searching orders...', page);
    searchOffers(function () {
    });

    // 予約集計
    showAggregateReservation();

    showAggregateEntranceGate();

    // 注文検索
    console.log('searching orders...', page);
    searchOrders(function () {
    });
    searchReservations(function () {
        console.log('creating charts...', reservations.length, 'reservations');
        showRemainingAttendeeCapacityChartByReservations();
        showReservationsBarChart();
    });
});

function showRemainingAttendeeCapacityChartByReservations() {
    // 全座席数は
    var numberOfSeats = 999;
    if (typeof eventByJson.maximumAttendeeCapacity === 'number') {
        numberOfSeats = eventByJson.maximumAttendeeCapacity
    }
    var datas = reservations.sort(function (a, b) {
        return moment(a.bookingTime).unix() - moment(b.bookingTime).unix();
    })
        .reduce(
            (a, b) => {
                numberOfSeats -= 1;

                var xValue = moment(b.bookingTime)
                    .toISOString();
                var existingData = a.find((data) => data.x === xValue);
                if (existingData !== undefined) {
                    existingData.y = numberOfSeats;
                } else {
                    a.push({
                        x: xValue,
                        y: numberOfSeats,
                    });
                }

                return a;
            },
            [
                // { x: moment(reservationStartDate).toISOString(), y: numberOfSeats },
                // { x: moment(eventByJson.endDate).toISOString(), y: null }
            ],
        );
    createRemainingAttendeeCapacityChart(datas);
}

function showReservationsBarChart() {
    var datas = reservations.sort(function (a, b) {
        return moment(a.bookingTime).unix() - moment(b.bookingTime).unix();
    })
        .reduce(
            (a, b) => {
                var xValue = moment(b.bookingTime)
                    .toISOString();
                var existingData = a.find((data) => data.x === xValue);
                if (existingData !== undefined) {
                    existingData.y += 1;
                } else {
                    a.push({
                        x: xValue,
                        y: 1,
                    });
                }

                return a;
            },
            [
            ],
        );
    createReservationsBarChart(datas);
}

function showAggregateReservation() {
    var maximumAttendeeCapacity = eventByJson.maximumAttendeeCapacity;
    var remainingAttendeeCapacity = eventByJson.remainingAttendeeCapacity;

    var reservationCount = '?';
    var checkInCount = '?';
    var attendeeCount = '?';
    var aggregateReservation = eventByJson.aggregateReservation;
    if (aggregateReservation !== undefined && aggregateReservation !== null) {
        reservationCount = aggregateReservation.reservationCount;
        checkInCount = aggregateReservation.checkInCount;
        attendeeCount = aggregateReservation.attendeeCount;
    }

    $('<dl>').html(
        '<dt>maximumAttendeeCapacity</dt>'
        + '<dd>' + maximumAttendeeCapacity + '</dd>'
        + '<dt>remainingAttendeeCapacity</dt>'
        + '<dd>' + remainingAttendeeCapacity + '</dd>'
        + '<dt>reservationCount</dt>'
        + '<dd>' + reservationCount + '</dd>'
        + '<dt>checkInCount</dt>'
        + '<dd>' + checkInCount + '</dd>'
        + '<dt>attendeeCount</dt>'
        + '<dd>' + attendeeCount + '</dd>'
    ).appendTo("#aggregateReservation");
}

function showAggregateEntranceGate() {
    const aggregateEntranceGate = eventByJson.aggregateEntranceGate;

    if (aggregateEntranceGate !== undefined) {
        const places = aggregateEntranceGate.places;
        if (Array.isArray(places) && places.length > 0) {
            $.each(places, function (_, place) {
                const offersOnEntranceGate = place.aggregateOffer.offers;
                $.each(offersOnEntranceGate, function (_, offer) {
                    var useActionCount = '?';
                    var aggregateReservation = offer.aggregateReservation;
                    if (aggregateReservation !== undefined && aggregateReservation !== null) {
                        useActionCount = aggregateReservation.useActionCount;
                    }

                    $('<tr>').html(
                        '<td>' + place.identifier + '</td>'
                        + '<td>' + offer.id + '</td>'
                        + '<td>' + offer.identifier + '</td>'
                        + '<td>' + String(useActionCount) + '</td>'
                        + '<td>' + String(aggregateReservation.aggregateDate) + '</td>'
                    ).appendTo("#aggregateEntranceGate tbody");
                });
            });
        }
    }
}

function searchOffers(cb) {
    $.getJSON(
        '/projects/' + PROJECT_ID + '/events/screeningEvent/' + eventByJson.id + '/aggregateOffer',
        { limit: limit, page: page }
    ).done(function (data) {
        $.each(data, function (_, offer) {
            offers.push(offer);

            var reservationCount = '?';
            var checkInCount = '?';
            var attendeeCount = '?';
            var aggregateReservation = offer.aggregateReservation;
            if (aggregateReservation !== undefined && aggregateReservation !== null) {
                reservationCount = aggregateReservation.reservationCount;
                checkInCount = aggregateReservation.checkInCount;
                attendeeCount = aggregateReservation.attendeeCount;
            }

            var name = '?';
            if (offer.name !== undefined && offer.name !== null) {
                name = offer.name.ja;
            }

            $('<tr>').html(
                '<td>' + offer.id + '</td>'
                + '<td>' + offer.identifier + '</td>'
                + '<td>' + name + '</td>'
                + '<td>' + String(offer.remainingAttendeeCapacity) + '/' + String(offer.maximumAttendeeCapacity) + '</td>'
                + '<td>' + String(reservationCount) + ' / ' + String(checkInCount) + ' / ' + String(attendeeCount) + '</td>'
            ).appendTo("#aggregateOffer tbody");
        });

        cb();
    }).fail(function () {
        console.error('オファーを検索できませんでした')
    });
}

function searchReservations(cb) {
    page4reservations += 1;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/reservations/search',
        {
            limit: limit4reservations,
            page: page4reservations,
            reservationFor: { id: eventByJson.id },
            reservationStatus: 'ReservationConfirmed',
            typeOf: 'EventReservation'
        }
    ).done(function (data) {
        searchedAllReservations = (data.results.length < limit4reservations);
        $.each(data.results, function (_, reservation) {
            reservations.push(reservation);

            // $('<tr>').html(
            //     '<td>' + '<a target="_blank" href="/projects/' + PROJECT_ID + '/orders/' + order.orderNumber + '">' + order.orderNumber + '</a>' + '</td>'
            //     + '<td>' + moment(order.orderDate).format('lllZ') + '</td>'
            //     + '<td>'
            //     + order.orderedItem.map(function (orderedItem) {
            //         return orderedItem.orderedItem.typeOf;
            //     }).join('<br>')
            //     + '</td>'
            //     + '<td>' + order.paymentMethods.map(function (paymentMethod) {
            //         return '<span class="badge badge-secondary ' + paymentMethod.typeOf + '">' + paymentMethod.typeOf + '</span>';
            //     }).join('&nbsp;') + '</td>'
            //     + '<td>' + '<span class="badge badge-secondary  ' + order.orderStatus + '">' + order.orderStatus + '</span>' + '</td>'
            // ).appendTo("#orders tbody");
        });
        if (!searchedAllReservations) {
            searchReservations(cb);
        } else {
            // 件数表示
            // $('#orderCount').html(orders.length.toString());
            cb();
        }
    }).fail(function () {
        console.error('予約を検索できませんでした')
    });
}

function searchOrders(cb) {
    page += 1;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/events/screeningEvent/' + eventByJson.id + '/orders',
        { limit: limit, page: page }
    ).done(function (data) {
        searchedAllOrders = (data.length < limit);
        $.each(data, function (_, order) {
            orders.push(order);

            $('<tr>').html(
                '<td>' + '<a target="_blank" href="/projects/' + PROJECT_ID + '/orders/' + order.orderNumber + '">' + order.orderNumber + '</a>' + '</td>'
                + '<td>' + moment(order.orderDate).format('lllZ') + '</td>'
                + '<td>'
                + order.orderedItem.map(function (orderedItem) {
                    return orderedItem.orderedItem.typeOf;
                }).join('<br>')
                + '</td>'
                + '<td>' + order.paymentMethods.map(function (paymentMethod) {
                    return '<span class="badge badge-secondary ' + paymentMethod.typeOf + '">' + paymentMethod.typeOf + '</span>';
                }).join('&nbsp;') + '</td>'
                + '<td>' + '<span class="badge badge-secondary  ' + order.orderStatus + '">' + order.orderStatus + '</span>' + '</td>'
            ).appendTo("#orders tbody");
        });
        if (!searchedAllOrders) {
            searchOrders(cb);
        } else {
            // 件数表示
            $('#orderCount').html(orders.length.toString());
            cb();
        }
    }).fail(function () {
        console.error('注文履歴を取得できませんでした')
    });
}

function createRemainingAttendeeCapacityChart(datas) {
    console.log('creating chart...datas:', datas.length);

    // This will get the first returned node in the jQuery collection.
    new Chart($('#remainingAttendeeCapacityChart2').get(0).getContext('2d'), {
        type: 'line',
        data: {
            // labels: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2', '2012 Q3', '2012 Q4', '2013 Q1', '2013 Q2'],
            datasets: [
                {
                    // label: status,
                    // fill: false,
                    // borderWidth: 2,
                    // lineTension: 0,
                    // spanGaps: true,
                    // borderColor: '#efefef',
                    // pointRadius: 2,
                    // pointHoverRadius: 7,
                    // pointColor: '#efefef',
                    // pointBackgroundColor: '#efefef',
                    data: datas.map(function (data) {
                        return { x: moment(data.x).toDate(), y: data.y }
                    })
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    // time: {
                    //     unit: 'day'
                    //     // displayFormats: {
                    //     //     quarter: 'MMM YYYY'
                    //     // }
                    // },
                    // ticks: {
                    //     fontColor: '#fff',
                    //     fontFamily: 'Open Sans',
                    //     fontSize: 10
                    // },
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        // stepSize: 5000,
                        // fontColor: '#fff',
                        // fontFamily: 'Open Sans',
                        // fontSize: 10
                    },
                    // gridLines: {
                    //     display: true,
                    //     color: '#efefef',
                    //     lineWidth: 1,
                    //     drawBorder: false,
                    // }
                }]
            }
        }
    });
}

function createReservationsBarChart(datas) {
    console.log('creating bar chart...datas:', datas.length, datas);

    // This will get the first returned node in the jQuery collection.
    new Chart($('#reservationsBarChart').get(0).getContext('2d'), {
        type: 'bar',
        data: {
            // labels: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2', '2012 Q3', '2012 Q4', '2013 Q1', '2013 Q2'],
            datasets: [
                {
                    // backgroundColor: '#efefef',
                    // borderColor: '#efefef',
                    // borderWidth: 2,
                    data: datas.map(function (data) {
                        return { x: moment(data.x).toDate(), y: data.y }
                    })
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    type: 'time',
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
