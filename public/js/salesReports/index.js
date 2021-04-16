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

    $(document).on('click', '.showCustomerIdentifier', function (event) {
        var orderNumber = $(this).attr('data-orderNumber');
        console.log('showing customer...orderNumber:', orderNumber);

        showCustomerIdentifier(orderNumber);
    });

    $(document).on('click', '.btn-downloadCSV', function () {
        onClickDownload();
    });
});

function showCustomerIdentifier(orderNumber) {
    var report = $.CommonMasterList.getDatas().find(function (data) {
        return data.isPartOf.mainEntity.orderNumber === orderNumber
    });
    if (report === undefined) {
        alert('レポート' + orderNumber + 'が見つかりません');

        return;
    }

    var modal = $('#modal-report');
    var title = 'レポート `' + report.isPartOf.mainEntity.orderNumber + '` カスタマー識別子';

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
    var url = '/projects/' + PROJECT_ID + '/salesReports?format=datatable';
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

async function onClickDownload() {
    var conditions4csv = $.fn.getDataFromForm('form.search');

    console.log('downloaing...');
    // this.utilService.loadStart({ process: 'load' });
    var notify = $.notify({
        // icon: 'fa fa-spinner',
        message: 'レポートダウンロードを開始します...',
    }, {
        type: 'primary',
        delay: 200,
        newest_on_top: true
    });

    const reports = [];
    let page = 0;
    while (true) {
        page += 1;
        conditions4csv.page = page;
        console.log('searching reports...', conditions4csv.limit, page);
        $.notify({
            message: page + 'ページ目を検索しています...',
        }, {
            type: 'primary',
            delay: 200,
            newest_on_top: true
        });

        // 全ページ検索する
        const searchResult = await new Promise((resolve, reject) => {
            $.ajax({
                url: '/projects/' + PROJECT_ID + '/salesReports?format=datatable',
                cache: false,
                type: 'GET',
                dataType: 'json',
                data: conditions4csv,
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
                var res = $.parseJSON(xhr.responseText);
                console.error(res.error);
                reject(new Error(res.error.message));
            }).always(function () {
                $('#loadingModal').modal('hide');
            });
        });

        if (Array.isArray(searchResult.results)) {
            reports.push(...searchResult.results);
        }

        if (searchResult.results.length < conditions4csv.limit) {
            break;
        }
    }

    console.log(reports.length, 'reports found');
    $.notify({
        message: reports.length + '件のレポートが見つかりました',
    }, {
        type: 'primary',
        delay: 2000,
        newest_on_top: true
    });

    const fields = [
        { label: 'アクションタイプ', default: '', value: 'mainEntity.typeOf' },
        { label: '金額', default: '', value: 'mainEntity.object.0.paymentMethod.totalPaymentDue.value' },
        { label: '通貨', default: '', value: 'mainEntity.object.0.paymentMethod.totalPaymentDue.currency' },
        { label: '決済方法ID', default: '', value: 'mainEntity.object.0.paymentMethod.paymentMethodId' },
        { label: '決済方法区分', default: '', value: 'mainEntity.object.0.paymentMethod.typeOf' },
        { label: '処理日時', default: '', value: 'mainEntity.startDate' },
        { label: 'アイテム', default: '', value: 'itemType' },
        { label: '注文番号', default: '', value: 'isPartOf.mainEntity.orderNumber' },
        { label: '注文日時', default: '', value: 'isPartOf.mainEntity.orderDate' },
        { label: 'アイテム数', default: '', value: 'isPartOf.mainEntity.numItems' },
        { label: '予約イベント日時', default: '', value: 'eventStartDates' },
        { label: 'アプリケーションクライアント', default: '', value: 'clientId' },
        { label: 'カスタマー識別子', default: '', value: 'isPartOf.mainEntity.customer.identifier' },
    ];
    const opts = {
        fields: fields,
        delimiter: ',',
        eol: '\n',
        // flatten: true,
        // preserveNewLinesInValues: true,
        // unwind: 'acceptedOffers'
    };

    const parser = new json2csv.Parser(opts);
    var csv = parser.parse(reports);
    const blob = string2blob(csv, { type: 'text/csv' });
    const fileName = 'salesReports.csv';
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