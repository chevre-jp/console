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

    $(document).on('click', '.showActions', function (event) {
        var transactionNumber = $(this).attr('data-transactionNumber');

        showActionsByTransactionNumber(transactionNumber);
    });

    $(document).on('click', '.showPaymentMethodAdditionalProperty', function (event) {
        var transactionNumber = $(this).attr('data-transactionNumber');

        showPaymentMethodAdditionalProperty(transactionNumber);
    });
});

function showPaymentMethodAdditionalProperty(transactionNumber) {
    var assetTransaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.transactionNumber === transactionNumber
    });
    if (assetTransaction === undefined) {
        alert('取引' + transactionNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-assetTransaction');
    var title = '取引 `' + assetTransaction.transactionNumber + '` 決済方法';

    var paymentMethod = assetTransaction.object.paymentMethod;
    var body = $('<dl>').addClass('row');
    if (paymentMethod !== undefined && paymentMethod !== null) {
        body.append($('<dt>').addClass('col-md-3').append($('<span>').text('決済方法区分')))
            .append($('<dd>').addClass('col-md-9').append(paymentMethod.typeOf))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('名称')))
            .append($('<dd>').addClass('col-md-9').append(paymentMethod.name))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('決済方法ID')))
            .append($('<dd>').addClass('col-md-9').append(paymentMethod.paymentMethodId))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('アカウント')))
            .append($('<dd>').addClass('col-md-9').append(paymentMethod.accountId));
    }

    if (Array.isArray(paymentMethod.additionalProperty)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(paymentMethod.additionalProperty.map(function (property) {
            return $('<tr>').append([
                $('<td>').text(property.name),
                $('<td>').text(property.value)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        body.append($('<dt>').addClass('col-md-3').append($('<span>').text('追加特性')))
            .append($('<dd>').addClass('col-md-9').html(table));
    } else {
        body.append($('<dt>').addClass('col-md-3').append($('<h6>').text('追加特性')))
            .append($('<dd>').addClass('col-md-9').text('なし'));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showActionsByTransactionNumber(transactionNumber) {
    var transaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.transactionNumber === transactionNumber
    });
    if (transaction === undefined) {
        alert(transactionNumber + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/assetTransactions/refund/' + transaction.transactionNumber + '/actions',
        cache: false,
        type: 'GET',
        data: { limit: 50, page: 1 },
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        showActions(transaction, data);
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function showActions(transaction, actions) {
    var modal = $('#modal-assetTransaction');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('typeOf'),
                $('<th>').text('開始'),
                $('<th>').text('説明')
            ])
        ]);
    var tbody = $('<tbody>')
        .append(actions.map(function (action) {
            var timeline = action.timeline;

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

            return $('<tr>').append([
                $('<td>').text(action.typeOf),
                $('<td>').text(action.startDate),
                $('<td>').html(description)
            ]);
        }))
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);

    var div = $('<div>')
        .append($('<div>').addClass('table-responsive').append(table));

    modal.find('.modal-title').text('アクション');
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

    $('input[name="selectedReservations"]:checked').prop('checked', false);
}

function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/assetTransactions/refund?format=datatable';
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
