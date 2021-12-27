
var person;
var offers = [];
var orders = [];
var searchedAllOrders = false;
var limit = 10;
var page = 0;

$(function () {
    person = JSON.parse($('#jsonViewer textarea').val());

    // 注文検索
    console.log('searching orders...', page);
    searchOrders(function () {
    });
});

function searchOrders(cb) {
    page += 1;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/people/' + person.id + '/orders',
        { limit: limit, page: page }
    )
        .done(function (result) {
            searchedAllOrders = (result.data.length < limit);
            $.each(result.data, function (_, order) {
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
