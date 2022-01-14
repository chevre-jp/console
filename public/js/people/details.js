
var person;
var orders = [];
var reservations = [];
var programMemberships = [];
var searchedAllOrders = false;
var searchedAllReservations = false;
var searchedAllProgramMemberships = false;
var limit = 10;
// var page = 0;

$(function () {
    person = JSON.parse($('#jsonViewer textarea').val());

    // 注文検索
    console.log('searching orders...');
    searchOrders(1, function () {
    });

    // 予約検索
    console.log('searching reservations...');
    searchReservations(1, function () {
    });

    // メンバーシップ検索
    console.log('searching programMemberships...');
    searchMemberships(1, function () {
    });

    // クレジットカード検索
    console.log('searching creditCards...');
    searchCreditCards(function () {
    });

    // 口座検索
    console.log('searching creditCards...');
    searchPaymentCards(function () {
    });
});

function searchOrders(page, cb) {
    // page += 1;
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
                searchOrders(page + 1, cb);
            } else {
                // 件数表示
                $('#orderCount').html(orders.length.toString());
                cb();
            }
        }).fail(function () {
            console.error('注文履歴を取得できませんでした')
        });
}

function searchReservations(page, cb) {
    // page += 1;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/people/' + person.id + '/reservations',
        { limit: limit, page: page }
    ).done(function (data) {
        searchedAllReservations = (data.data.length < limit);
        $.each(data.data, function (key, ownershipInfo) {
            var reservation = ownershipInfo.typeOfGood;
            reservations.push(reservation);

            var bookingTimeStr = '';
            if (typeof reservation.bookingTime === 'string') {
                bookingTimeStr = moment(reservation.bookingTime).utc().format();
            }

            var html = '<td>' + reservation.reservationNumber + '</td>'
                + '<td>' + bookingTimeStr + '</td>';
            if (reservation.reservationFor !== undefined) {
                html += '<td>' + '<a target="_blank" href="/projects/' + PROJECT_ID + '/events/screeningEvent/' + reservation.reservationFor.id + '">' + reservation.reservationFor.name.ja + '</a>' + '</td>';
            } else {
                html += '<td></td>';
            }
            html += '<td>' + '<span class="badge badge-light ' + reservation.reservationStatus + '">' + reservation.reservationStatus + '</span>' + '</td>';
            $('<tr>').html(html).appendTo("#reservations tbody");
        });
        if (!searchedAllReservations) {
            searchReservations(page + 1, cb);
        } else {
            cb();
        }
    }).fail(function () {
        alert('予約を検索できませんでした')
    });
}

function searchMemberships(page, cb) {
    // page += 1;
    $.getJSON(
        '/projects/' + PROJECT_ID + '/people/' + person.id + '/memberships',
        { limit: limit, page: page }
    ).done(function (data) {
        searchedAllProgramMemberships = (data.data.length < limit);
        $.each(data.data, function (key, ownershipInfo) {
            var serviceOutput = ownershipInfo.typeOfGood;
            programMemberships.push(serviceOutput);

            var nameStr = serviceOutput.name;
            if (typeof nameStr !== 'string' && nameStr !== undefined && nameStr !== null) {
                nameStr = nameStr.ja;
            }

            var membershipServiceId = 'unknown';
            if (serviceOutput.issuedThrough !== undefined && serviceOutput.issuedThrough !== null) {
                membershipServiceId = serviceOutput.issuedThrough.id;
            }

            var html = '<td>' + serviceOutput.identifier + '</td>'
                + '<td>' + membershipServiceId + '</td>'
                + '<td>' + moment(ownershipInfo.ownedFrom).utc().format() + '</td>'
                + '<td>' + moment(ownershipInfo.ownedThrough).utc().format() + '</td>';
            $('<tr>').html(html).appendTo("#programMemberships tbody");
        });
        if (!searchedAllProgramMemberships) {
            searchMemberships(page + 1, cb);
        } else {
            cb();
        }
    }).fail(function () {
        alert('メンバーシップを検索できませんでした')
    });
}

function searchCreditCards(cb) {
    $.getJSON(
        '/projects/' + PROJECT_ID + '/people/' + person.id + '/creditCards'
    ).done(function (data) {
        $("#creditCards tbody").empty();
        $.each(data, function (key, creditCard) {
            var html = '<td>' + '<a href="#">' + creditCard.cardName + '</a>' + '</td>'
                + '<td>' + creditCard.holderName + '</td>'
                + '<td>' + creditCard.cardNo + '</td>'
                + '<td>' + creditCard.expire + '</td>'
                + '<td><a href="javascript:void(0)" class="text-muted deleteCreditCard" data-cardSeq="' + creditCard.cardSeq + '" data-cardNo="' + creditCard.cardNo + '"><i class="fas fa-trash-alt"></i></a></td>';
            $('<tr>').html(html).appendTo("#creditCards tbody");
        });

        cb(data);
    }).fail(function () {
        alert('クレジットカードを検索できませんでした')
    });
}

function searchPaymentCards(cb) {
    $.getJSON(
        '/projects/' + PROJECT_ID + '/people/' + person.id + '/paymentCards'
    ).done(function (data) {
        $("#accounts tbody").empty();
        $.each(data, function (key, ownershipInfo) {
            var permit = ownershipInfo.typeOfGood;
            var account = permit.paymentAccount;

            var html = '<td>'
                + ((account !== undefined) ? account.accountType : '?')
                + '</td>'
                + '<td>'
                + ((account !== undefined) ? account.accountNumber : '?')
                + '</td>'
                + '<td>'
                + '<span class="badge badge-secondary ' + ((account !== undefined) ? account.status : '?') + '">'
                + ((account !== undefined) ? account.status : '?')
                + '</span>'
                + '</td>'
                + '<td>'
                + ((account !== undefined) ? account.availableBalance : '?')
                + '</td>';
            $('<tr>').html(html).appendTo("#accounts tbody");
        });

        cb(data);
    }).fail(function () {
        alert('ペイメントカードを検索できませんでした')
    });
}