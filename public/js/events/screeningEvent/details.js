
var event;
var offers = [];
var orders = [];
var searchedAllOrders = false;
var limit = 10;
var page = 0;
var remainingAttendeeCapacityChart;
var remainingAttendeeCapacityChart2;

$(function () {
    event = JSON.parse($('#jsonViewer textarea').val());

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
        console.log('creating line chart...', orders.length, 'orders', orders);
        // 全座席数は
        var numberOfSeats = 999;
        if (Number.isInteger(event.maximumAttendeeCapacity)) {
            numberOfSeats = event.maximumAttendeeCapacity
        }
        // 売り出し日時は？
        // var reservationStartDate = moment(event.startDate).add(-3, 'days').toDate();
        // var reservationPeriodInMinutes = moment(event.endDate).diff(moment(reservationStartDate), 'hours');
        var datas = orders.sort(function (a, b) {
            return moment(a.orderDate).unix() - moment(b.orderDate).unix();
        })
            .reduce(
                (a, b) => {
                    numberOfSeats -= b.acceptedOffers.length;
                    // 予約開始からの時間
                    // const diff = moment(b.orderDate).diff(moment(reservationStartDate), 'hours', true);
                    a.push({
                        x: moment(b.orderDate).toISOString(),
                        y: numberOfSeats,
                    });

                    return a;
                },
                [
                    // { x: moment(reservationStartDate).toISOString(), y: numberOfSeats },
                    // { x: moment(event.endDate).toISOString(), y: null }
                ],
            );
        createRemainingAttendeeCapacityChart(datas);
    });
});

function showAggregateReservation() {
    var maximumAttendeeCapacity = event.maximumAttendeeCapacity;
    var remainingAttendeeCapacity = event.remainingAttendeeCapacity;

    var reservationCount = '?';
    var checkInCount = '?';
    var attendeeCount = '?';
    var aggregateReservation = event.aggregateReservation;
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
    const aggregateEntranceGate = event.aggregateEntranceGate;

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
        '/projects/' + PROJECT_ID + '/events/screeningEvent/' + event.id + '/aggregateOffer',
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

function searchOrders(cb) {
    page += 1;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/events/screeningEvent/' + event.id + '/orders',
        { limit: limit, page: page }
    ).done(function (data) {
        searchedAllOrders = (data.length < limit);
        $.each(data, function (_, order) {
            orders.push(order);

            var numDisplayItems = 4;

            $('<tr>').html(
                '<td>' + '<a target="_blank" href="/projects/' + PROJECT_ID + '/orders/' + order.orderNumber + '">' + order.orderNumber + '</a>' + '</td>'
                + '<td>' + moment(order.orderDate).format('lllZ') + '</td>'
                + '<td>'
                + order.acceptedOffers.slice(0, numDisplayItems).map(function (o) {
                    if (o.itemOffered.reservedTicket !== undefined && o.itemOffered.reservedTicket.ticketedSeat !== undefined) {
                        return o.itemOffered.reservedTicket.ticketedSeat.seatNumber
                    }
                    return o.itemOffered.typeOf;
                }).join('<br>')
                + order.acceptedOffers.slice(numDisplayItems, numDisplayItems + 1).map(() => '<br>...').join('')
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
    // remainingAttendeeCapacityChart2 = new Morris.Line({
    //     element: 'remainingAttendeeCapacityChart2',
    //     resize: true,
    //     data: datas.map(function (data) {
    //         return { y: data.x, remainingCapacity: data.y }
    //     }),
    //     xkey: 'y',
    //     ykeys: ['remainingCapacity'],
    //     labels: ['残席数遷移'],
    //     lineColors: ['#efefef'],
    //     lineWidth: 2,
    //     hideHover: 'auto',
    //     gridTextColor: '#fff',
    //     gridStrokeWidth: 0.4,
    //     pointSize: 4,
    //     pointStrokeColors: ['#efefef'],
    //     gridLineColor: '#efefef',
    //     gridTextFamily: 'Open Sans',
    //     gridTextSize: 10
    // });

    // This will get the first returned node in the jQuery collection.
    new Chart($('#remainingAttendeeCapacityChart2').get(0).getContext('2d'), {
        type: 'line',
        data: {
            // labels: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2', '2012 Q3', '2012 Q4', '2013 Q1', '2013 Q2'],
            datasets: [
                {
                    label: status,
                    fill: false,
                    borderWidth: 2,
                    lineTension: 0,
                    spanGaps: true,
                    borderColor: '#efefef',
                    pointRadius: 2,
                    pointHoverRadius: 7,
                    pointColor: '#efefef',
                    pointBackgroundColor: '#efefef',
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
                    time: {
                        unit: 'day'
                        // displayFormats: {
                        //     quarter: 'MMM YYYY'
                        // }
                    },
                    ticks: {
                        fontColor: '#fff',
                        fontFamily: 'Open Sans',
                        fontSize: 10
                    },
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        // stepSize: 5000,
                        fontColor: '#fff',
                        fontFamily: 'Open Sans',
                        fontSize: 10
                    },
                    gridLines: {
                        display: true,
                        // color: '#555c62',
                        // color: '#efefef',
                        lineWidth: 1,
                        drawBorder: false,
                    }
                }]
            }
        }
    });
}
