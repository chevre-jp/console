/**
 * プロジェクトホームを表現するためのjs
 */
var PROJECT_ID = $('input[name="projectId"]').val();

var orders = [];
var searchedAllOrders = false;
var limit = 10;
var page = 0;

$(function () {
    // SLIMSCROLL FOR CHAT WIDGET
    // $('#chat-box').slimScroll({
    //     height: '250px'
    // })

    // Fix for charts under tabs
    $('.box ul.nav a').on('shown.bs.tab', function () {
        // area.redraw()
        // donut.redraw()
        // line.redraw()
    })

    updateCharts();
    setInterval(
        function () {
            updateCharts();
        },
        60000
    );
});

function updateCharts() {
    updateHealth(function () {
    });

    updateDbStats(function () {
    });

    updateQueueCount(function () {
    });

    updateLatestReservations(function () {
    });

    updateLatestOrders(function () {
    });

    updateLatestActions(function () {
    });

    updateEventsWithAggregation(function () {
    });

    updateErrorReporting(function () {
    });
}

function updateHealth(cb) {
    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/health',
        {}
    ).done(function (data) {
        console.log('health:', data);
        $('.health').removeClass('text-danger').text(data.status);
        $('.version').text(data.version);

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('ヘルス情報を検索できませんでした', jqXHR);
        $('.health').addClass('text-danger').text(textStatus);
    });
}

function updateDbStats(cb) {
    if ($('.usedSpace').length === 0) {
        return;
    }

    var GB = 1000000000;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/dbStats',
        {}
    ).done(function (data) {
        console.log('stats:', data);
        var usedSpaceStr = Math.floor(Number(data.fsUsedSize) / GB)
            + '/'
            + Math.floor(Number(data.fsTotalSize) / GB);
        var dbText = data.db + ' has ' + data.objects + ' objects';

        $('.usedSpace').removeClass('text-danger').text(usedSpaceStr);
        $('.dbText').text(dbText);

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('DB統計を検索できませんでした', jqXHR);
        $('.usedSpace').addClass('text-danger').text(textStatus);
    });
}

function updateQueueCount(cb) {
    // $.getJSON(
    //     '/projects/' + PROJECT_ID +'/home/queueCount',
    //     {}
    // ).done(function (data) {
    //     console.log('QueueCount:', data);
    //     $('.queueCount').removeClass('text-danger').text(data.totalCount);

    //     cb();
    // }).fail(function (jqXHR, textStatus, error) {
    //     console.error('キューを検索できませんでした', jqXHR);
    //     $('.queueCount').addClass('text-danger').text(textStatus);
    // });
}

function updateLatestReservations(cb) {
    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/latestReservations',
        {
            limit: 10,
            page: 1,
            // sort: { orderDate: -1 },
            // orderDateFrom: moment().add(-1, 'day').toISOString(),
            // orderDateThrough: moment().toISOString()
        }
    ).done(function (data) {
        $('#latestReservations tbody').empty();

        // $('.eventsCount').text(data.totalCount);

        $.each(data.data, function (_, reservation) {
            var html = '<td>' + reservation.reservationNumber + '</td>'
                + '<td>' + moment(reservation.bookingTime).format('MM/DD HH:mmZ') + '</td>'
                + '<td>' + reservation.reservationFor.name.ja.slice(0, 5) + '...</td>';
            // + '<td><span class="text-muted">' + reservation.reservationStatus + '</span></td>';
            $('<tr>').html(html)
                .appendTo('#latestReservations tbody');
        });

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('予約を検索できませんでした', jqXHR);
        $('<p>').addClass('display-4 text-danger')
            .text(textStatus)
            .appendTo('#latestReservations tbody');
    });
}

function updateLatestOrders(cb) {
    if ($('#latestOrders tbody').length === 0) {
        return;
    }

    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/latestOrders',
        {
            limit: 10,
            page: 1,
            // sort: { orderDate: -1 },
            // orderDateFrom: moment().add(-1, 'day').toISOString(),
            // orderDateThrough: moment().toISOString()
        }
    ).done(function (data) {
        $('#latestOrders tbody').empty();

        // $('.eventsCount').text(data.totalCount);

        $.each(data.data, function (_, order) {
            var html = '<td>' + order.orderNumber + '</td>'
                + '<td>' + moment(order.orderDate).format('MM/DD HH:mmZ') + '</td>'
                + '<td>' + order.price + ' ' + order.priceCurrency + '</td>';
            // + '<td><span class="text-muted">' + reservation.reservationStatus + '</span></td>';
            $('<tr>').html(html)
                .appendTo('#latestOrders tbody');
        });

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('注文を検索できませんでした', jqXHR);
        $('<p>').addClass('display-4 text-danger')
            .text(textStatus)
            .appendTo('#latestOrders tbody');
    });
}

function updateLatestActions(cb) {
    if ($('#latestActions tbody').length === 0) {
        return;
    }

    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/timelines',
        {
            limit: 10,
            page: 1,
            startFrom: moment()
                .add(-1, 'day')
                .toISOString(),
            startThrough: moment()
                .toISOString()
        }
    ).done(function (data) {
        $('#latestActions tbody').empty();

        $.each(data, function (_, timeline) {
            var description = '<a href="javascript:void(0)">' + timeline.agent.name
                + '</a>が';

            if (timeline.recipient !== undefined) {
                var recipientName = String(timeline.recipient.name);
                if (recipientName.length > 40) {
                    recipientName = String(timeline.recipient.name).slice(0, 40) + '...';
                }
                description += '<a href="javascript:void(0)">'
                    + '<span>' + recipientName + '</span>'
                    + '</a> に';
            }

            if (timeline.purpose !== undefined) {
                description += '<a href="javascript:void(0)">'
                    + '<span>' + timeline.purpose.name + '</span>'
                    + '</a> のために';
            }

            description += '<a href="javascript:void(0)">'
                + '<span>' + timeline.object.name + '</span>'
                + '</a> を'
                + '<span>' + timeline.actionName + '</span>'
                + '<span>' + timeline.actionStatusDescription + '</span>';

            var html = '<td>' + description + '</td>'
                + '<td>' + '<span class="badge ' + timeline.action.actionStatus + '">' + moment(timeline.action.startDate).fromNow() + '</span>' + '</td>';
            $('<tr>').html(html)
                .appendTo('#latestActions tbody');
        });

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('アクションを検索できませんでした', jqXHR);
        $('<p>').addClass('display-4 text-danger')
            .text(textStatus)
            .appendTo('#latestActions tbody');
    });
}

function updateEventsWithAggregation(cb) {
    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/eventsWithAggregations',
        {
            limit: 10,
            page: 1,
            sort: { orderDate: -1 },
            orderDateFrom: moment().add(-1, 'day').toISOString(),
            orderDateThrough: moment().toISOString()
        }
    ).done(function (data) {
        $('.eventsWithAggregation tbody').empty();

        var eventsCountStr = data.data.length + '件';
        if (data.data.length >= 10) {
            eventsCountStr = data.data.length + '件以上';
        }
        $('.eventsCount').text(eventsCountStr);

        $.each(data.data, function (_, event) {
            var name = '?';
            var reservationCount = '?';
            var checkInCount = '?';
            var attendeeCount = '?';

            if (event.name !== undefined && event.name !== null) {
                if (typeof event.name === 'string') {
                    name = event.name.slice(0, 5);
                } else {
                    name = event.name.ja.slice(0, 5);
                }
            }

            if (event.aggregateReservation !== undefined && event.aggregateReservation !== null) {
                reservationCount = String(event.aggregateReservation.reservationCount);
                checkInCount = String(event.aggregateReservation.checkInCount);
                attendeeCount = String(event.aggregateReservation.attendeeCount);
            }

            var html = '<td>' + moment(event.startDate).format('MM/DD HH:mmZ') + '</td>'
                + '<td>' + name + '...</td>'
                + '<td>' + event.superEvent.location.name.ja + '</td>'
                + '<td>' + reservationCount + '</td>'
                + '<td>' + checkInCount + '</td>'
                + '<td>' + attendeeCount + '</td>';
            $('<tr>').html(html).appendTo('.eventsWithAggregation tbody');
        });

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('イベント集計を検索できませんでした', jqXHR);
        $('<p>').addClass('display-4 text-danger')
            .text(textStatus)
            .appendTo('.eventsWithAggregation tbody');
    });
}

function updateErrorReporting(cb) {
    if ($('.errorReporting').length === 0) {
        return;
    }

    $.getJSON(
        '/projects/' + PROJECT_ID + '/home/errorReporting',
        {
            limit: 10,
            page: 1,
            sort: { orderDate: -1 },
            orderDateFrom: moment().add(-1, 'day').toISOString(),
            orderDateThrough: moment().toISOString()
        }
    ).done(function (data) {
        $('.errorReporting .table, errorReporting .card-category').empty();

        if (data.data.length === 0) {
            $('.errorReporting .card-category').text('過去24時間以内に発生したエラーはありません');
        } else {
            var thead = $('<thead>').addClass('text-primary')
                .append($('<th>').text('Name'))
                .append($('<th>').text('Runs'))
                .append($('<th>').text('Message'));
            var tbody = $('<tbody>');

            $.each(data.data, function (_, task) {
                var message = '';

                if (Array.isArray(task.executionResults) && task.executionResults.length > 0) {
                    var firstResult = task.executionResults[0];
                    if (typeof firstResult.error === 'string') {
                        message += firstResult.error;
                    } else if (firstResult.error !== undefined && firstResult.error !== null) {
                        message += firstResult.error.message;
                    }
                }

                var tr = $('<tr>')
                    .append($('<td>').text(task.name))
                    .append($('<td>').text(moment(task.runsAt).format('MM-DD HH:mm:ssZ')))
                    .append($('<td>').text(message));

                tbody.append(tr);
            });

            $('.errorReporting .table').append([thead, tbody]);
        }

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('エラーレポートを検索できませんでした', jqXHR);
        $('<p>').addClass('display-4 text-danger')
            .text(textStatus)
            .appendTo('.errorReporting');
    });
}