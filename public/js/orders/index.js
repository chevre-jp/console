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

    $(document).on('click', '.showOrder', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showOrder(orderNumber);
    });

    $(document).on('click', '.showCustomer', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');
        console.log('showing customer...orderNumber:', orderNumber);

        showCustomer(orderNumber);
    });

    $(document).on('click', '.showBroker', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showBroker(orderNumber);
    });

    $(document).on('click', '.showReturner', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showReturner(orderNumber);
    });

    $(document).on('click', '.showPaymentMethods', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showPaymentMethods(orderNumber);
    });

    $(document).on('click', '.showItems', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');

        showItems(orderNumber);
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

    $(document).on('click', '.btn-downloadCSV', function () {
        onClickDownload();
    });

    $(document).on('click', '.showIdentifier', function (event) {
        var orderNumber = $(this).attr('data-ordernumber');

        showIdentifiersByOrderNumber(orderNumber);
    });

    $(document).on('click', '.showActions', function (event) {
        var orderNumber = $(this).attr('data-ordernumber');

        showActionsByOrderNumber(orderNumber);
    });
});

function showIdentifiersByOrderNumber(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-order');
    var title = '注文 `' + order.orderNumber + '` 識別子';

    var body = $('<dl>').addClass('row');

    if (Array.isArray(order.identifier)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(order.identifier.map(function (property) {
            return $('<tr>').append([
                $('<td>').text(property.name),
                $('<td>').text(property.value)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        body.append($('<dd>').addClass('col-md-12').html(table));
    } else {
        body.append($('<dd>').addClass('col-md-12').text('なし'));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showActionsByOrderNumber(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert(orderNumber + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/orders/' + order.orderNumber + '/actions',
        cache: false,
        type: 'GET',
        data: { limit: 50, page: 1 },
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        showActions(order, data);
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function showActions(order, actions) {
    var modal = $('#modal-order');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('タイプ'),
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
                $('<td>').html(
                    $('<span>')
                        .addClass(['badge', 'badge-light'].join(' '))
                        .text(action.typeOf)
                ),
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

function showOrder(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#showModal');
    var title = '注文 `' + order.orderNumber + '`';

    var body = $('<dl>').addClass('row');
    body.append($('<dt>').addClass('col-md-3').append('注文番号'))
        .append($('<dd>').addClass('col-md-9').append(order.orderNumber))
        .append($('<dt>').addClass('col-md-3').append('確認番号'))
        .append($('<dd>').addClass('col-md-9').append(order.confirmationNumber))
        .append($('<dt>').addClass('col-md-3').append('注文日時'))
        .append($('<dd>').addClass('col-md-9').append(moment(order.orderDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')))
        .append($('<dt>').addClass('col-md-3').append('ステータス'))
        .append($('<dd>').addClass('col-md-9').append(order.orderStatus));

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showItems(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-order');
    var title = '注文 `' + order.orderNumber + '` アイテム';

    var acceptedOffers = order.acceptedOffers;
    var body = $('<div>');
    var thead = $('<thead>').addClass('text-primary');
    var tbody = $('<tbody>');
    thead.append([
        $('<tr>').append([
            $('<th>').text('プロダクト'),
            $('<th>').text('名称'),
            $('<th>').text('ID'),
            $('<th>').text('コード'),
            $('<th>').text('価格仕様')
        ])
    ]);
    tbody.append(acceptedOffers.map(function (offer) {
        var item = offer.itemOffered;
        var productHtml = $('<div>');
        if (item.typeOf === 'Permit') {
            productHtml.append([
                $('<span>')
                    .addClass(['badge', 'badge-light'].join(' '))
                    .text(item.issuedThrough.typeOf),
                $('<br>'),
                $('<span>').text(item.issuedThrough.id)
            ]);
        }
        if (item.typeOf === 'EventReservation') {
            productHtml.append([
                $('<span>')
                    .addClass(['badge', 'badge-light'].join(' '))
                    .text(item.reservationFor.typeOf),
                $('<br>'),
                $('<span>').text(item.reservationFor.id),
                $('<br>'),
                $('<span>').text(item.reservationFor.name.ja),
                $('<br>'),
                $('<span>').text('@' + item.reservationFor.superEvent.location.name.ja + ' ' + item.reservationFor.location.name.ja)
            ]);
        }

        var id = '';
        var identifier = '';
        if (item.typeOf === 'Permit') {
            identifier = item.identifier;
        } else {
            id = item.id;
        }

        var thead4priceSpecs = $('<thead>').addClass('text-primary');
        var tbody4priceSpecs = $('<tbody>');
        thead4priceSpecs.append([
            $('<tr>').append([
                $('<th>').text('タイプ'),
                $('<th>').text('名称'),
                $('<th>').text('価格')
            ])
        ]);
        var priceComponent = offer.priceSpecification.priceComponent;
        if (!Array.isArray(priceComponent)) {
            priceComponent = [];
        }
        tbody4priceSpecs.append(priceComponent.map(function (priceSpec) {
            var priceStr = priceSpec.price + ' ' + priceSpec.priceCurrency;
            if (priceSpec.referenceQuantity !== undefined) {
                priceStr += ' / ' + priceSpec.referenceQuantity.value + ' ' + priceSpec.referenceQuantity.unitCode;
            }
            return $('<tr>').append([
                $('<td>').text(priceSpec.typeOf),
                $('<td>').text(priceSpec.name.ja),
                $('<td>').text(priceStr)
            ]);
        }));
        var table4priceSpecs = $('<table>').addClass('table table-sm')
            // .append([thead4priceSpecs, tbody4priceSpecs]);
            .append([tbody4priceSpecs]);

        return $('<tr>').append([
            $('<td>').html(productHtml),
            $('<td>').text(item.name),
            $('<td>').text(id),
            $('<td>').text(identifier),
            $('<td>').html(table4priceSpecs)
        ]);
    }));
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);
    body.append(table);

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showCustomer(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-order');
    var title = '注文 `' + order.orderNumber + '` カスタマー';

    var customer = order.customer;
    var body = $('<dl>').addClass('row');
    if (customer !== undefined && customer !== null) {
        body.append($('<dt>').addClass('col-md-3').append($('<span>').text('タイプ')))
            .append($('<dd>').addClass('col-md-9').append(customer.typeOf))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('ID')))
            .append($('<dd>').addClass('col-md-9').append(customer.id))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('名称')))
            .append($('<dd>').addClass('col-md-9').append(customer.name))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('メールアドレス')))
            .append($('<dd>').addClass('col-md-9').append(customer.email))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('電話番号')))
            .append($('<dd>').addClass('col-md-9').append(customer.telephone));
    }

    if (Array.isArray(customer.identifier)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(customer.identifier.map(function (property) {
            return $('<tr>').append([
                $('<td>').text(property.name),
                $('<td>').text(property.value)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        body.append($('<dt>').addClass('col-md-3').append($('<span>').text('識別子')))
            .append($('<dd>').addClass('col-md-9').html(table));
    } else {
        body.append($('<dt>').addClass('col-md-3').append($('<h6>').text('識別子')))
            .append($('<dd>').addClass('col-md-9').text('なし'));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showBroker(orderNumber) {
    var order = $.CommonMasterList.getDatas().find(function (data) {
        return data.orderNumber === orderNumber
    });
    if (order === undefined) {
        alert('注文' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-order');
    var title = '注文 `' + order.orderNumber + '` 代理';

    var body = $('<div>');

    body.append($('<textarea>')
        .val(JSON.stringify(order.broker, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

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
    var url = '/projects/' + PROJECT_ID + '/orders/search';
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

async function onClickDownload() {
    var conditions4csv = $.fn.getDataFromForm('form.search');

    // 注文日時条件がなければ警告
    if (typeof conditions4csv.orderFrom !== 'string' || conditions4csv.orderFrom.length === 0
        || typeof conditions4csv.orderThrough !== 'string' || conditions4csv.orderThrough.length === 0) {
        if (!window.confirm('注文日期間が指定されていません。ダウンロードに時間がかかる可能性がありますが続けますか？')) {
            return false;
        }
    }

    console.log('downloaing...');
    // this.utilService.loadStart({ process: 'load' });
    var notify = $.notify({
        // icon: 'fa fa-spinner',
        message: 'ダウンロードを開始します...',
    }, {
        type: 'primary',
        delay: 200,
        newest_on_top: true
    });
    var limit4download = 50;

    const datas = [];
    let page = 0;
    while (true) {
        page += 1;
        conditions4csv.page = page;
        console.log('searching reports...', limit4download, page);
        var notifyOnSearching = $.notify({
            message: page + 'ページ目を検索しています...',
        }, {
            type: 'primary',
            delay: 200,
            newest_on_top: true
        });

        // 全ページ検索する
        var searchResult = undefined;
        var searchError = { message: 'unexpected error' };
        // retry some times
        var tryCount = 0;
        const MAX_TRY_COUNT = 3;
        while (tryCount < MAX_TRY_COUNT) {
            try {
                tryCount += 1;

                searchResult = await new Promise((resolve, reject) => {
                    $.ajax({
                        url: '/projects/' + PROJECT_ID + '/orders/search',
                        cache: false,
                        type: 'GET',
                        dataType: 'json',
                        data: {
                            ...conditions4csv,
                            limit: limit4download
                        },
                        // data: {
                        //     // limit,
                        //     page,
                        //     format: 'datatable'
                        // }
                        beforeSend: function () {
                            $('#loadingModal').modal({ backdrop: 'static' });
                        }
                    }).done(function (result) {
                        console.log('searched.', result);
                        resolve(result);
                    }).fail(function (xhr) {
                        var res = { error: { message: '予期せぬエラー' } };
                        try {
                            var res = $.parseJSON(xhr.responseText);
                            console.error(res.error);
                        } catch (error) {
                            // no op                    
                        }
                        reject(new Error(res.error.message));
                    }).always(function () {
                        $('#loadingModal').modal('hide');
                        notifyOnSearching.close();
                    });
                });

                break;
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
                searchError = error;
            }
        }

        if (searchResult === undefined) {
            alert('ダウンロードが中断されました。再度お試しください。' + searchError.message);

            return;
        }

        if (Array.isArray(searchResult.results)) {
            datas.push(...searchResult.results.map(function (order) {
                return order2report({ order });
            }));
        }

        if (searchResult.results.length < limit4download) {
            break;
        }
    }

    console.log(datas.length, 'reports found');
    $.notify({
        message: datas.length + '件の予約が見つかりました',
    }, {
        type: 'primary',
        delay: 2000,
        newest_on_top: true
    });

    const fields = [
        { label: '注文番号', default: '', value: 'orderNumber' },
        { label: '注文日時', default: '', value: 'orderDate' },
        { label: '注文ステータス', default: '', value: 'orderStatus' },
        { label: '確認番号', default: '', value: 'confirmationNumber' },
        // { label: '注文識別子', default: '', value: 'identifier' },
        { label: '金額', default: '', value: 'price' },
        { label: 'カスタマータイプ', default: '', value: 'customer.typeOf' },
        { label: 'カスタマーID', default: '', value: 'customer.id' },
        { label: 'カスタマー名称', default: '', value: 'customer.name' },
        { label: 'カスタマー名', default: '', value: 'customer.givenName' },
        { label: 'カスタマー姓', default: '', value: 'customer.familyName' },
        { label: 'カスタマーメールアドレス', default: '', value: 'customer.email' },
        { label: 'カスタマー電話番号', default: '', value: 'customer.telephone' },
        // { label: 'カスタマー会員番号', default: '', value: 'customer.memberOf.membershipNumber' },
        // { label: 'カスタマートークン発行者', default: '', value: 'customer.tokenIssuer' },
        { label: 'カスタマー追加特性', default: '', value: 'customer.additionalProperty' },
        { label: 'カスタマー識別子', default: '', value: 'customer.identifier' },
        { label: 'アプリケーションID', default: '', value: 'applicationId' },
        { label: 'アプリケーション名称', default: '', value: 'applicationName' },
        // { label: '販売者タイプ', default: '', value: 'seller.typeOf' },
        { label: '販売者ID', default: '', value: 'seller.id' },
        { label: '販売者名称', default: '', value: 'seller.name' },
        // { label: '販売者URL', default: '', value: 'seller.url' },
        { label: 'オファータイプ', default: '', value: 'acceptedOffers.typeOf' },
        { label: 'オファーID', default: '', value: 'acceptedOffers.id' },
        { label: 'オファー名称', default: '', value: 'acceptedOffers.name' },
        { label: 'オファー単価仕様価格', default: '', value: 'acceptedOffers.unitPriceSpecification.price' },
        { label: 'オファー単価仕様通貨', default: '', value: 'acceptedOffers.unitPriceSpecification.priceCurrency' },
        { label: '注文アイテムタイプ', default: '', value: 'acceptedOffers.itemOffered.typeOf' },
        { label: '注文アイテムID', default: '', value: 'acceptedOffers.itemOffered.id' },
        // { label: '注文アイテム名称', default: '', value: 'acceptedOffers.itemOffered.name' },
        { label: '注文アイテム数', default: '', value: 'acceptedOffers.itemOffered.numItems' },
        // { label: '注文アイテムイベントタイプ', default: '', value: 'acceptedOffers.itemOffered.event.typeOf' },
        { label: '注文アイテムイベントID', default: '', value: 'acceptedOffers.itemOffered.event.id' },
        { label: '注文アイテムイベント名称', default: '', value: 'acceptedOffers.itemOffered.event.name' },
        { label: '注文アイテムイベント開始日時', default: '', value: 'acceptedOffers.itemOffered.event.startDate' },
        { label: '注文アイテムイベント終了日時', default: '', value: 'acceptedOffers.itemOffered.event.endDate' },
        { label: '注文アイテムイベントコンテンツコード', default: '', value: 'acceptedOffers.itemOffered.event.creativeWorkIdentifier' },
        { label: '注文アイテムイベントコンテンツ名称', default: '', value: 'acceptedOffers.itemOffered.event.creativeWorkName' },
        { label: '注文アイテムイベントルームコード', default: '', value: 'acceptedOffers.itemOffered.event.locationBranchCode' },
        { label: '注文アイテムイベントルーム名称', default: '', value: 'acceptedOffers.itemOffered.event.location' },
        { label: '注文アイテムイベント施設コード', default: '', value: 'acceptedOffers.itemOffered.event.superEventLocationBranchCode' },
        { label: '注文アイテムイベント施設名称', default: '', value: 'acceptedOffers.itemOffered.event.superEventLocation' },
        { label: '決済方法タイプ1', default: '', value: 'paymentMethodType.0' },
        { label: '決済ID1', default: '', value: 'paymentMethodId.0' },
        { label: '決済方法タイプ2', default: '', value: 'paymentMethodType.1' },
        { label: '決済ID2', default: '', value: 'paymentMethodId.1' },
        { label: '決済方法タイプ3', default: '', value: 'paymentMethodType.2' },
        { label: '決済ID3', default: '', value: 'paymentMethodId.2' },
        { label: '決済方法タイプ4', default: '', value: 'paymentMethodType.3' },
        { label: '決済ID4', default: '', value: 'paymentMethodId.3' }
    ];
    const transforms = [json2csv.transforms.unwind({ paths: ['acceptedOffers'] })];
    const opts = {
        fields: fields,
        delimiter: ',',
        eol: '\n',
        // flatten: true,
        // preserveNewLinesInValues: true,
        // unwind: 'acceptedOffers',
        transforms
    };

    const parser = new json2csv.Parser(opts);
    var csv = parser.parse(datas);
    const blob = string2blob(csv, { type: 'text/csv' });
    const fileName = 'orders.csv';
    download(blob, fileName);

    return false;
}

/**
 * 文字列をBLOB変換
 */
function string2blob(value, options) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    return new Blob([bom, value], options);
}

function download(blob, fileName) {
    if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, fileName);
        window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    }
}

function order2report(params) {
    const order = params.order;
    var event;

    const acceptedOffers = order.acceptedOffers.map(
        // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
        (acceptedOffer) => {
            var unitPriceSpecification;

            if (acceptedOffer.priceSpecification !== undefined) {
                switch (acceptedOffer.priceSpecification.typeOf) {
                    case 'UnitPriceSpecification':
                        const priceSpec = acceptedOffer.priceSpecification;

                        unitPriceSpecification = {
                            price: (typeof priceSpec.price === 'number') ? String(priceSpec.price) : '',
                            priceCurrency: String(priceSpec.priceCurrency)
                        };

                        break;

                    case 'CompoundPriceSpecification':
                        const compoundPriceSpec = acceptedOffer.priceSpecification;

                        const unitPriceSpec = compoundPriceSpec.priceComponent.find(
                            (component) => component.typeOf === 'UnitPriceSpecification'
                        );
                        if (unitPriceSpec !== undefined) {
                            unitPriceSpecification = {
                                price: (typeof unitPriceSpec.price === 'number') ? String(unitPriceSpec.price) : '',
                                priceCurrency: String(unitPriceSpec.priceCurrency)
                            };
                        }

                        break;

                    default:
                }
            }

            const itemOffered = acceptedOffer.itemOffered;
            let item = {
                typeOf: String(itemOffered.typeOf),
                name: (typeof (itemOffered).name === 'string') ? (itemOffered).name : '',
                numItems: 1,
                id: (typeof (itemOffered).id === 'string') ? (itemOffered).id : '',
                event: {
                    typeOf: '',
                    id: '',
                    name: '',
                    startDate: '',
                    endDate: '',
                    locationBranchCode: '',
                    location: '',
                    superEventLocationBranchCode: '',
                    superEventLocation: '',
                    creativeWorkIdentifier: '',
                    creativeWorkName: ''
                }
            };

            switch (itemOffered.typeOf) {
                case 'EventReservation':
                    const reservation = itemOffered;
                    event = reservation.reservationFor;
                    const ticket = reservation.reservedTicket;
                    const ticketedSeat = ticket.ticketedSeat;

                    let name = '';
                    let numItems = 1;

                    name = [
                        (ticketedSeat !== undefined) ? ticketedSeat.seatNumber : '',
                        (typeof reservation.reservedTicket.ticketType.name === 'string')
                            ? reservation.reservedTicket.ticketType.name
                            : reservation.reservedTicket.ticketType.name?.ja
                    ].join(' ');

                    if (reservation.numSeats !== undefined) {
                        // tslint:disable-next-line:max-line-length
                        numItems = reservation.numSeats;
                    }

                    item = {
                        typeOf: itemOffered.typeOf,
                        name: name,
                        numItems: numItems,
                        id: reservation.id,
                        event: {
                            typeOf: (event !== undefined) ? event.typeOf : '',
                            id: (event !== undefined) ? event.id : '',
                            name: (typeof event.name.ja === 'string')
                                ? event.name.ja
                                : '',
                            startDate: (event !== undefined) ? moment(event.startDate)
                                .toISOString() : '',
                            endDate: (event !== undefined) ? moment(event.endDate)
                                .toISOString() : '',
                            locationBranchCode: (typeof event.location.branchCode === 'string')
                                ? event.location.branchCode
                                : '',
                            location: (typeof event.location.name?.ja === 'string')
                                ? event.location.name.ja
                                : '',
                            superEventLocationBranchCode: (event !== undefined) ? event.superEvent.location.branchCode : '',
                            superEventLocation: (typeof event.superEvent.location.name?.ja === 'string')
                                ? event.superEvent.location.name.ja
                                : '',
                            creativeWorkIdentifier: (typeof event.superEvent.workPerformed?.identifier === 'string')
                                ? event.superEvent.workPerformed.identifier
                                : '',
                            creativeWorkName: (typeof event.superEvent.workPerformed.name === 'string')
                                ? event.superEvent.workPerformed.name
                                : ''
                        }
                    };
                    break;

                default:
            }

            return {
                typeOf: acceptedOffer.typeOf,
                id: (typeof acceptedOffer.id === 'string') ? acceptedOffer.id : '',
                name: (typeof acceptedOffer.name === 'string')
                    ? acceptedOffer.name
                    : (typeof acceptedOffer.name?.ja === 'string') ? acceptedOffer.name.ja : '',
                unitPriceSpecification: {
                    price: (unitPriceSpecification !== undefined) ? unitPriceSpecification.price : '',
                    priceCurrency: (unitPriceSpecification !== undefined) ? unitPriceSpecification.priceCurrency : ''
                },
                itemOffered: item
            };
        }
    );

    const customerIdentifier = (Array.isArray(order.customer.identifier)) ? order.customer.identifier : [];
    const clientIdProperty = customerIdentifier.find((p) => p.name === 'clientId');
    const tokenIssuerProperty = customerIdentifier.find((p) => p.name === 'tokenIssuer');

    return {
        orderDate: moment(order.orderDate)
            .toISOString(),
        seller: {
            typeOf: order.seller.typeOf,
            id: String(order.seller.id),
            name: String(order.seller.name),
            url: (order.seller.url !== undefined) ? order.seller.url : ''
        },
        customer: {
            typeOf: order.customer.typeOf,
            id: order.customer.id,
            name: String(order.customer.name),
            givenName: String(order.customer.givenName),
            familyName: String(order.customer.familyName),
            email: String(order.customer.email),
            telephone: String(order.customer.telephone),
            memberOf: order.customer.memberOf,
            clientId: (clientIdProperty !== undefined) ? clientIdProperty.value : '',
            tokenIssuer: (tokenIssuerProperty !== undefined) ? tokenIssuerProperty.value : '',
            additionalProperty: (Array.isArray(order.customer.additionalProperty)) ? JSON.stringify(order.customer.additionalProperty) : '',
            identifier: (Array.isArray(order.customer.identifier)) ? JSON.stringify(order.customer.identifier) : ''
        },
        acceptedOffers: acceptedOffers,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        confirmationNumber: order.confirmationNumber.toString(),
        price: `${order.price} ${order.priceCurrency}`,
        paymentMethodType: order.paymentMethods.map((method) => method.typeOf),
        paymentMethodId: order.paymentMethods.map((method) => method.paymentMethodId),
        identifier: (Array.isArray(order.identifier)) ? JSON.stringify(order.identifier) : '',
        applicationId: order.application?.id,
        applicationName: order.application?.name
    };
}
