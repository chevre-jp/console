var offerCatalogId = '';
var form = {
    price: ''
};

$(function () {
    offerCatalogId = $('input[name="id"]').val();

    $('#price').on('change', onPriceChanged);

    $('#itemOffered\\[typeOf\\]').on('change', resetOffers);

    // form submit
    $('.btn-ok').on('click', submit);

    // 削除ボタン
    $('.btn-delete').on('click', remove);

    $('#sortable1, #sortable2').sortable({
        connectWith: '.connectedSortable'
    })
        .disableSelection();

    // 選択済オファー表示初期化
    initializeOffers();

    // show or hide 対象券種名
    var priceList = $('#sortable2 > li').length;
    if (priceList === 0) {
        // $('#sortable1').hide();
        // $('#sortable2').hide();
    }
});

function initializeOffers() {
    var selectedOffers = JSON.parse($('textarea[name="selectedOffers"]').val());

    selectedOffers.forEach(function (offer) {
        var li = offer2list(offer);
        $('#sortable2').append(li);
    });

    $('#sortable2').show();
}

/**
 * 削除
 */
function remove() {
    if (window.confirm('元には戻せません。本当に削除しますか？')) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/offerCatalogs/' + offerCatalogId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/offerCatalogs';
            })
            .fail(function (jqxhr, textStatus, error) {
                var message = '削除できませんでした';
                if (jqxhr.responseJSON != undefined && jqxhr.responseJSON.error != undefined) {
                    message += ': ' + jqxhr.responseJSON.error.message;
                }
                alert(message);
            })
            .always(function () {
            });
    }
}

/**
 * 更新
 */
function submit() {
    var offerIds = [];
    // オファーリストに含まれる決済カード区分リスト
    var appliesToMovieTicketTypes = [];

    $('#sortable2 > li').each(function () {
        var uid = $(this).attr('uid');
        offerIds.push(uid);
        var appliesToMovieTicketType = $(this).attr('appliesToMovieTicketType');
        if (typeof appliesToMovieTicketType === 'string' && appliesToMovieTicketType.length > 0) {
            appliesToMovieTicketTypes.push(appliesToMovieTicketType);
        }
    });

    // 決済カード区分の重複を確認
    var uniqueAppliesToMovieTicketTypes = appliesToMovieTicketTypes.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });
    if (appliesToMovieTicketTypes.length !== uniqueAppliesToMovieTicketTypes.length) {
        alert('決済カード区分が重複しています');

        return false;
    }

    offerIds.forEach(function (offerId, index) {
        $('<input />').attr('type', 'hidden')
            .attr('name', 'itemListElement[' + index + '][id]')
            .attr('value', offerId)
            .appendTo('#ticketTypeGroupsForm');
    });

    $('.btn-ok').addClass('disabled')
        .text('processing...');

    $('form').submit();
}

function searchOffersByPrice(price, itemOfferedType) {
    var options = {
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/offerCatalogs/searchOffersByPrice',
        cache: false,
        type: 'GET',
        data: {
            price: Number(price),
            itemOffered: { typeOf: itemOfferedType }
        }
    };

    return $.ajax(options);
}

/**
 * オファー売上金額変更
 */
function onPriceChanged() {
    var price = $(this).val();
    if (price === '' || form.price === price) {
        return;
    }
    form.price = price;

    // 選択済のオファーリスト
    var selectedOfferIds = [];
    $('#sortable2 > li').each(function () {
        var uid = $(this).attr('uid');
        selectedOfferIds.push(uid);
    });
    $('#sortable1').empty();

    // アイテム選択済かどうか
    const itemOfferedType = $('#itemOffered\\[typeOf\\]').val();
    if (typeof itemOfferedType !== 'string' || itemOfferedType.length <= 0) {
        alert('アイテムを選択してください');
    }

    searchOffersByPrice(form.price, itemOfferedType)
        .then(function (data) {
            var offers = data.results;
            if (data.success) {
                // すでに選択済のオファーを除外
                offers.filter(function (offer) {
                    return selectedOfferIds.indexOf(offer.id) < 0;
                })
                    .forEach(function (offer) {
                        var li = offer2list(offer);
                        $('#sortable1').append(li);
                    });

                $('#sortable1').show();
            }
        })
        .catch(function (jqxhr, textStatus, error) {
            alert('オファーの検索に失敗しました');
        });
}

function offer2list(offer) {
    var appliesToMovieTicketType = '';
    if (offer.priceSpecification.appliesToMovieTicket !== undefined
        && offer.priceSpecification.appliesToMovieTicket !== null
        && typeof offer.priceSpecification.appliesToMovieTicket.serviceType === 'string') {
        appliesToMovieTicketType = offer.priceSpecification.appliesToMovieTicket.serviceType;
    }

    var text = offer.alternateName.ja
        + '('
        + offer.priceSpecification.price
        + ' / '
        + offer.priceSpecification.referenceQuantity.value
        + ')';
    var span = $('<span>').addClass('btn btn-primary btn-block')
        .text(text);
    var li = $('<li>').addClass('list-group-item p-0')
        .attr({
            uid: offer.id,
            appliesToMovieTicketType: appliesToMovieTicketType
        })
        .html(span);

    return li;
}

function resetOffers() {
    $('#sortable1').empty();
    $('#sortable2').empty();
}