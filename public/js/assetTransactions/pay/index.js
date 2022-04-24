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

    $(document).on('click', '.showReturner', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showReturner(orderNumber);
    });

    $(document).on('click', '.showPaymentMethods', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showPaymentMethods(orderNumber);
    });

    $(document).on('change', 'input[name="selectedReservations"]', function () {
        var selectedReservations = getSelectedReservations();
        console.log(selectedReservations.length, 'selected');
        var selectedReservationsExist = selectedReservations.length > 0;

        var isAllConfimed = true;
        selectedReservations.forEach(function (selectedReservation) {
            if (selectedReservation.reservationStatus !== 'ReservationConfirmed') {
                isAllConfimed = false;
            }
        });

        if (selectedReservationsExist && isAllConfimed) {
            $('.btn-cancel').removeClass('disabled');
        } else {
            $('.btn-cancel').addClass('disabled');
        }
    });

    $('#customerId').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '顧客選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/customers/getlist',
            dataType: 'json',
            data: function (params) {
                var query = {
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
                    results: data.results.map(function (customer) {
                        return {
                            id: customer.id,
                            text: customer.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#application').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'アプリ選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/applications/search',
            dataType: 'json',
            data: function (params) {
                var query = {
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
                    results: data.results.map(function (application) {
                        return {
                            id: application.id,
                            text: application.name
                        }
                    })
                };
            }
        }
    });

    $('#seller').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/sellers/getlist',
            dataType: 'json',
            data: function (params) {
                var query = {
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
                    results: data.results.map(function (seller) {
                        return {
                            id: seller.id,
                            text: seller.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#paymentMethodType').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '決済方法選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/categoryCodes/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    inCodeSet: { identifier: 'PaymentMethodType' },
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
                    results: data.results.map(function (paymentMethodType) {
                        return {
                            id: paymentMethodType.codeValue,
                            text: paymentMethodType.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#broker\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'ユーザー選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/orders/searchAdmins',
            dataType: 'json',
            data: function (params) {
                var query = {
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
                    results: data.results.map(function (member) {
                        return {
                            id: member.member.id,
                            text: member.member.name
                        }
                    })
                };
            }
        }
    });

    $('#programMembershipUsed\\[issuedThrough\\]\\[serviceType\\]\\[codeValue\\]').select2({
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
                    inCodeSet: { identifier: 'MembershipType' }
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

    $(document).on('click', '.showActions', function (event) {
        var transactionNumber = $(this).attr('data-transactionNumber');

        showActionsByTransactionNumber(transactionNumber);
    });

    $(document).on('click', '.searchGMOTrade', function (event) {
        var transactionNumber = $(this).attr('data-transactionNumber');

        searchGMOTrade(transactionNumber);
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
        url: '/projects/' + PROJECT_ID + '/assetTransactions/pay/' + transaction.transactionNumber + '/actions',
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

function searchGMOTrade(transactionNumber) {
    var transaction = $.CommonMasterList.getDatas().find(function (data) {
        return data.transactionNumber === transactionNumber
    });
    if (transaction === undefined) {
        alert(transactionNumber + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/assetTransactions/pay/' + transaction.transactionNumber + '/searchGMOTrade',
        cache: false,
        type: 'GET',
        data: { limit: 50, page: 1 },
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        var modal = $('#modal-assetTransaction');
        var div = $('<div>')

        div.append($('<textarea>')
            .val(JSON.stringify(data, null, '\t'))
            .addClass('form-control')
            .attr({
                rows: '25',
                disabled: ''
            })
        );

        modal.find('.modal-title').text('決済代行取引');
        modal.find('.modal-body').html(div);
        modal.modal();
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

function showReturner(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-order');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(order.returner, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('返品者');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showPaymentMethods(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-order');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(order.paymentMethods, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('決済方法');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function initializeView() {
    $('.btn-cancel').addClass('disabled');

    $('input[name="selectedReservations"]:checked').prop('checked', false);
}

/**
 * 注文検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/assetTransactions/pay?format=datatable';
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

function getSelectedReservations() {
    var selectedReservationBoxes = $('input[name="selectedReservations"]:checked');

    var selectedReservationIds = [];
    selectedReservationBoxes.each(function () {
        selectedReservationIds.push($(this).val());
    });

    var selectedReservations = $.CommonMasterList.getDatas()
        .filter(function (data) {
            return selectedReservationIds.indexOf(data.id) >= 0;
            // }).filter(function (data) {
            //     return data.reservationStatus === 'ReservationConfirmed';
        });

    return selectedReservations;
}
