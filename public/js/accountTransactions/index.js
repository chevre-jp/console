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

    var issuedThroughSelection = $('#issuedThrough\\[id\\]');
    issuedThroughSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/products/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    typeOf: { $eq: 'PaymentCard' },
                    name: params.term
                }

                // Query parameters will be ?search=[term]&type=public
                return query;
            },
            delay: 250, // wait 250 milliseconds before triggering the request
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
            processResults: function (data) {
                // movieOptions = data.data;

                // Transforms the top-level key of the response object from 'items' to 'results'
                return {
                    results: data.results.map(function (product) {
                        return {
                            id: product.id,
                            text: product.name.ja
                        }
                    })
                };
            }
        }
    });
});

function initializeView() {
    // $('.btn-cancel').addClass('disabled');

    // $('input[name="selectedReservations"]:checked').prop('checked', false);
}

/**
 * 検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/accountTransactions?format=datatable';
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
        if (jqxhr.status === 403) {
            alert('権限がありません');
        } else {
            alert(error);
        }
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function showMoneyTransferActionsById(accountNumber) {
    var account = $.CommonMasterList.getDatas().find(function (data) {
        return data.accountNumber === accountNumber
    });
    if (account === undefined) {
        alert(accountNumber + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/accounts/' + account.accountNumber + '/moneyTransferActions',
        cache: false,
        type: 'GET',
        data: { limit: 50, page: 1 },
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        showMoneyTransferActions(account, data);
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function showMoneyTransferActions(account, actions) {
    var modal = $('#modal-account');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('開始'),
                $('<th>').text('終了'),
                $('<th>').text('ステータス'),
                $('<th>').text('From'),
                $('<th>').text('To'),
                $('<th>').text('金額'),
                $('<th>').text('説明'),
                $('<th>').text('取引')
            ])
        ]);
    var tbody = $('<tbody>')
        .append(actions.map(function (action) {
            return $('<tr>').append([
                $('<td>').text(action.startDate),
                $('<td>').text(action.endDate),
                $('<td>').text(action.actionStatus),
                $('<td>').html(
                    action.fromLocation.typeOf
                    + ((typeof action.fromLocation.accountNumber === 'string') ? '<br>' + String(action.fromLocation.accountNumber) : '')
                    + ((typeof action.fromLocation.name === 'string') ? '<br>' + String(action.fromLocation.name) : '')
                ),
                $('<td>').html(
                    action.toLocation.typeOf
                    + ((typeof action.toLocation.accountNumber === 'string') ? '<br>' + String(action.toLocation.accountNumber) : '')
                    + ((typeof action.toLocation.name === 'string') ? '<br>' + String(action.toLocation.name) : '')
                ),
                $('<td>').text(action.amount.value + ' ' + action.amount.currency),
                $('<td>').text(action.description),
                $('<td>').text(action.purpose.typeOf)
            ]);
        }))
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);

    var div = $('<div>')
        // .append(seller)
        // .append(availability)
        // .append(validity)
        .append($('<div>').addClass('table-responsive').append(table));

    modal.find('.modal-title').text('転送アクション');
    modal.find('.modal-body').html(div);
    modal.modal();
}
