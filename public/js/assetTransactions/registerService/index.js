var conditions = {};

$(function () {
    var ITEMS_ON_PAGE = Number($('input[name="limit"]').val());

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    })

    //Enter押下で検索
    $('form.search').on('keydown', function () {
        if (window.event.keyCode == 13) $('.btn-ok').click();
    });

    // 共通一覧表示初期セット・ページャセット
    $.CommonMasterList.init('#templateRow', '#searchedCount');
    $.CommonMasterList.pager('#pager', ITEMS_ON_PAGE, function (pageNumber) {
        search(pageNumber);
    });

    // 検索ボタンイベント
    $(document).on('click', '.btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form.search');
        // 検索API呼び出し
        search(1);
    });

    $('.btn-ok').click();

    $(document).on('click', '.showAssetTransaction', function (event) {
        var transactionNumber = $(this).attr('data-transactionNumber');

        showAssetTransaction(transactionNumber);
    });

    $(document).on('click', '.showServiceOutputs', function (event) {
        var transactionNumber = $(this).attr('data-transactionNumber');

        showServiceOutputs(transactionNumber);
    });
});

function showServiceOutputs(transactionNumber) {
    var assetTransaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.transactionNumber === transactionNumber
    });
    if (assetTransaction === undefined) {
        alert('取引' + transactionNumber + 'が見つかりません');

        return;
    }

    let serviceOutputs = [];
    if (Array.isArray(assetTransaction.object)) {
        serviceOutputs = assetTransaction.object.map((o) => o.itemOffered.serviceOutput);
    }
    var modal = $('#modal-assetTransaction');
    var title = '取引 `' + assetTransaction.transactionNumber + '` serviceOutputs' + '(' + serviceOutputs.length + ')';

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('発行サービスタイプ'),
                $('<th>').text('発行サービスID'),
                $('<th>').text('identifier'),
                $('<th>').text('dateIssued'),
                $('<th>').text('name'),
                $('<th>').text('validFor')
            ])
        ]);
    var tbody = $('<tbody>')
        .append(serviceOutputs.map(function (permit) {
            return $('<tr>').append([
                $('<td>').text(permit.issuedThrough.typeOf),
                $('<td>').text(permit.issuedThrough.id),
                $('<td>').text(permit.identifier),
                $('<td>').text(permit.dateIssued),
                $('<td>').text(permit.name),
                $('<td>').html(permit.validFor)
            ]);
        }))
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);

    var div = $('<div>')
        .append($('<div>').addClass('table-responsive').append(table));

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showAssetTransaction(transactionNumber) {
    var assetTransaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.transactionNumber === transactionNumber
    });
    if (assetTransaction === undefined) {
        alert('取引' + transactionNumber + 'が見つかりません');

        return;
    }

    var modal = $('#showModal');
    var title = '取引 `' + assetTransaction.transactionNumber + '`';

    var body = $('<dl>').addClass('row');
    body.append($('<dt>').addClass('col-md-3').append('ID'))
        .append($('<dd>').addClass('col-md-9').append(assetTransaction.id))
    body.append($('<dt>').addClass('col-md-3').append('取引番号'))
        .append($('<dd>').addClass('col-md-9').append(assetTransaction.transactionNumber))

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function initializeView() {
    $('.btn-cancel').addClass('disabled');
}

/**
 * 検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/assetTransactions/registerService?format=datatable';
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
            var dataCount = (data.count) ? (data.count) : 0;
            // 一覧表示
            if ($.CommonMasterList.bind(data.results, dataCount, pageNumber)) {
                $('#list').show();
            } else {
                $('#list').hide();
            }
        }
    }).fail(function (jqxhr, textStatus, error) {
        alert(error);
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}
