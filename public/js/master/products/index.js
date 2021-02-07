$(function () {
    var ITEMS_ON_PAGE = Number($('input[name="limit"]').val());

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    })

    //Enter押下で検索
    $('form').on('keydown', function () {
        if (window.event.keyCode == 13) $('.btn-ok').click();
    });

    // 共通一覧表示初期セット・ページャセット
    $.CommonMasterList.init('#templateRow', '#searchedCount');
    $.CommonMasterList.pager('#pager', ITEMS_ON_PAGE, function (pageNumber) {
        search(pageNumber);
    });

    var conditions = {};
    $(document).on('click', '.searchProducts .btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form');
        // 検索API呼び出し
        search(1);
    });

    $(document).on('click', '.showProduct', function (event) {
        var id = $(this).attr('data-id');
        showProduct(id);
    });

    $(document).on('click', '.showOffers', function (event) {
        var id = $(this).attr('data-id');
        showOffers(id);
    });

    $(document).on('click', '.showServiceOutput', function (event) {
        var id = $(this).attr('data-id');
        showServiceOutput(id);
    });

    $('.btn-ok').click();

    function search(pageNumber) {
        conditions['limit'] = ITEMS_ON_PAGE;
        conditions['page'] = pageNumber;
        var url = '/projects/' + PROJECT_ID + '/products/search';

        $.ajax({
            dataType: 'json',
            url: url,
            cache: false,
            type: 'GET',
            data: conditions,
            beforeSend: function () {
                $('#loadingModal').modal({ backdrop: 'static' });
            }
        }).done(function (data) {
            if (data.success) {
                //alert("success:" + data.count);
                var dataCount = (data.count) ? (data.count) : 0;
                // 一覧表示
                if ($.CommonMasterList.bind(data.results, dataCount, pageNumber)) {
                    $('#list').show();
                } else {
                    $('#list').hide();
                }
            }
        }).fail(function (jqxhr, textStatus, error) {
            alert("fail");
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }
});

function showProduct(id) {
    var product = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (product === undefined) {
        alert('プロダクト' + id + 'が見つかりません');

        return;
    }

    var modal = $('#showModal');

    modal.find('a.edit')
        .off('click')
        .on('click', function () {
            var url = '/projects/' + PROJECT_ID + '/products/' + product.id;
            window.open(url, '_blank');
        });

    modal.find('a.registerService')
        .addClass('disabled')
        .attr('aria-disabled', true)
        .off('click');
    if (['MembershipService', 'Account', 'PaymentCard'].indexOf(product.typeOf) >= 0) {
        modal.find('a.registerService')
            .removeClass('disabled')
            .attr('aria-disabled', false)
            .off('click')
            .on('click', function () {
                var url = '/projects/' + PROJECT_ID + '/transactions/registerService/start?product=' + product.id;
                window.open(url, '_blank');
            });
    }

    var details = $('<dl>').addClass('row')
        .append($('<dt>').addClass('col-md-3').append('プロダクトID'))
        .append($('<dd>').addClass('col-md-9').append(product.productID))
        .append($('<dt>').addClass('col-md-3').append('名称'))
        .append($('<dd>').addClass('col-md-9').append(product.name.ja));

    details.append($('<dt>').addClass('col-md-3').append('カタログ'));
    if (product.hasOfferCatalog !== undefined) {
        details.append($('<dd>').addClass('col-md-9').append($('<a>').attr({
            target: '_blank',
            'href': '/projects/' + PROJECT_ID + '/offerCatalogs/' + product.hasOfferCatalog.id + '/update'
        }).text(product.hasOfferCatalog.id)));
    } else {
        details.append($('<dd>').addClass('col-md-9').append($('<span>').text('')));
    }

    // details.append($('<dt>').addClass('col-md-3').append('販売者'))
    //     .append($('<dd>').addClass('col-md-9').append(seller.id))
    //     .append($('<dt>').addClass('col-md-3').append('販売期間'))
    //     .append($('<dd>').addClass('col-md-9').append(
    //         moment(performance.offers.validFrom).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm')
    //         + ' - '
    //         + moment(performance.offers.validThrough).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm')
    //     ))
    //     ;

    var div = $('<div>')
        .append(details);

    // modal.find('.modal-title').text('イベントオファー');
    modal.find('.modal-body').html(div);

    modal.modal();
}
function showOffers(id) {
    var product = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (product === undefined) {
        alert('プロダクト' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-product');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(product.offers, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('Offers');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showServiceOutput(id) {
    var product = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (product === undefined) {
        alert('プロダクト' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-product');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(product.serviceOutput, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('ServiceOutput');
    modal.find('.modal-body').html(div);
    modal.modal();
}
