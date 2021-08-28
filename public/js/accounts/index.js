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

    $(document).on('click', '.showCustomerAdditionalProperty', function (event) {
        var accountNumber = $(this).attr('data-accountNumber');
        console.log('showing customer...accountNumber:', accountNumber);

        showCustomerAdditionalProperty(accountNumber);
    });

    $(document).on('click', '.showMoneyTransferActions', function (event) {
        var accountNumber = $(this).attr('data-accountNumber');

        showMoneyTransferActionsById(accountNumber);
    });

    $('#accountType').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/categoryCodes/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: { identifier: 'CurrencyType' }
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
                    results: data.results.map(function (categoryCode) {
                        return {
                            id: categoryCode.codeValue,
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#status').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/accountStatusTypes',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term }
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
                    results: data.map(function (accountStatusType) {
                        return {
                            id: accountStatusType.codeValue,
                            text: accountStatusType.name
                        }
                    })
                };
            }
        }
    });

});

function showCustomerAdditionalProperty(accountNumber) {
    var account = $.CommonMasterList.getDatas().find(function (data) {
        return data.isPartOf.mainEntity.accountNumber === accountNumber
    });
    if (account === undefined) {
        alert(accountNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-account');
    var title = account.accountNumber + '` 追加特性';

    var customer = report.isPartOf.mainEntity.customer;
    var body = $('<dl>').addClass('row');
    if (customer !== undefined && customer !== null) {
        // body.append($('<dt>').addClass('col-md-3').append($('<span>').text('タイプ')))
        //     .append($('<dd>').addClass('col-md-9').append(customer.typeOf))
        //     .append($('<dt>').addClass('col-md-3').append($('<span>').text('ID')))
        //     .append($('<dd>').addClass('col-md-9').append(customer.id))
        //     .append($('<dt>').addClass('col-md-3').append($('<span>').text('名称')))
        //     .append($('<dd>').addClass('col-md-9').append(customer.name))
        //     .append($('<dt>').addClass('col-md-3').append($('<span>').text('メールアドレス')))
        //     .append($('<dd>').addClass('col-md-9').append(customer.email))
        //     .append($('<dt>').addClass('col-md-3').append($('<span>').text('電話番号')))
        //     .append($('<dd>').addClass('col-md-9').append(customer.telephone));

        if (Array.isArray(customer.additionalProperty)) {
            var thead = $('<thead>').addClass('text-primary');
            var tbody = $('<tbody>');
            thead.append([
                $('<tr>').append([
                    $('<th>').text('Name'),
                    $('<th>').text('Value')
                ])
            ]);
            tbody.append(customer.additionalProperty.map(function (property) {
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
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

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
    var url = '/projects/' + PROJECT_ID + '/accounts?format=datatable';
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

    // var validity = $('<dl>').addClass('row')
    //     .append($('<dt>').addClass('col-md-3').append('販売期間'))
    //     .append($('<dd>').addClass('col-md-9').append(
    //         moment(event.offers.validFrom).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss')
    //         + ' - '
    //         + moment(event.offers.validThrough).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss')
    //     ));

    var div = $('<div>')
        // .append(seller)
        // .append(availability)
        // .append(validity)
        .append($('<div>').addClass('table-responsive').append(table));

    modal.find('.modal-title').text('転送アクション');
    modal.find('.modal-body').html(div);
    modal.modal();
}
