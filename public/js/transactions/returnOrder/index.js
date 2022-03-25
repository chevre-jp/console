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

    $(document).on('click', '.showTransaction', function (event) {
        var transactionId = $(this).attr('data-id');
        showTransaction(transactionId);
    });

    $(document).on('click', '.showAttribute', function (event) {
        var transactionId = $(this).attr('data-id');
        showAttribute(transactionId, $(this).attr('data-attribute'));
    });

    $(document).on('click', '.showActions', function (event) {
        var transactionId = $(this).attr('data-id');
        showActionsByTransactionId(transactionId);
    });
});

function showActionsByTransactionId(transactionId) {
    var transaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === transactionId
    });
    if (transaction === undefined) {
        alert(transactionId + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/transactions/ReturnOrder/' + transaction.id + '/actions',
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
    var modal = $('#modal-transaction');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('typeOf'),
                $('<th>').text('開始'),
                $('<th>').text('ステータス'),
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
                $('<td>').html(
                    $('<span>')
                        .addClass(['badge', 'badge-light', action.actionStatus].join(' '))
                        .text(action.actionStatus)
                ),
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

function showTransaction(transactionId) {
    var transaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === transactionId
    });
    if (transaction === undefined) {
        alert('取引' + transactionId + 'が見つかりません');

        return;
    }

    var modal = $('#showModal');
    var title = '取引 `' + transaction.id + '`';

    var body = $('<dl>').addClass('row');
    body.append($('<dt>').addClass('col-md-3').append('ID'))
        .append($('<dd>').addClass('col-md-9').append(transaction.id))
    body.append($('<dt>').addClass('col-md-3').append('取引番号'))
        .append($('<dd>').addClass('col-md-9').append(transaction.transactionNumber))

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showAttribute(transactionId, attribute) {
    var transaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === transactionId
    });
    if (transaction === undefined) {
        alert('取引' + transactionId + 'が見つかりません');

        return;
    }

    var modal = $('#modal-transaction');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(transaction[attribute], null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text(attribute);
    modal.find('.modal-body').html(div);
    modal.modal();
}

function initializeView() {
    $('.btn-cancel').addClass('disabled');

    // $('input[name="selectedReservations"]:checked').prop('checked', false);
}

/**
 * 検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/transactions/ReturnOrder?format=datatable';
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
