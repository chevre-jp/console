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

    // 属性を詳しく見る
    $(document).on('click', '.showAttribute', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing additionalProperty...id:', id);

        showAttribute(id, $(this).attr('data-attribute'));
    });

    var issuedThroughTypeOf = $('#issuedThrough\\[typeOf\\]\\[\\$eq\\]').val();
    var issuedThroughSelection = $('#issuedThrough\\[id\\]\\[\\$eq\\]');
    issuedThroughSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/products/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    typeOf: { $eq: issuedThroughTypeOf },
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

    $('#issuedBy\\[id\\]\\[\\$eq\\]').select2({
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

    $(document).on('click', '.btn-downloadCSV', function () {
        onClickDownload();
    });
});

function showAttribute(id, attribute) {
    var serviceOutput = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (serviceOutput === undefined) {
        alert('サービスアウトプット' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-serviceOutput');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(serviceOutput[attribute], null, '\t'))
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
}

/**
 * 予約検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/serviceOutputs/search';
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
                        url: '/projects/' + PROJECT_ID + '/reservations/search',
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
            datas.push(...searchResult.results.map(function (reservation) {
                return reservation2report({ reservation });
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
        { label: 'ID', default: '', value: 'id' },
        { label: '予約番号', default: '', value: 'reservationNumber' },
        { label: '予約ステータス', default: '', value: 'reservationStatus' },
        { label: '追加チケットテキスト', default: '', value: 'additionalTicketText' },
        { label: '予約日時', default: '', value: 'bookingTime' },
        { label: '更新日時', default: '', value: 'modifiedTime' },
        { label: '座席数', default: '', value: 'numSeats' },
        { label: '発券済', default: '', value: 'checkedIn' },
        { label: '入場済', default: '', value: 'attended' },
        { label: 'イベントID', default: '', value: 'reservationFor.id' },
        { label: 'イベント名称', default: '', value: 'reservationFor.name' },
        { label: 'イベント開始日時', default: '', value: 'reservationFor.startDate' },
        { label: 'イベント終了日時', default: '', value: 'reservationFor.endDate' },
        { label: '座席番号', default: '', value: 'reservedTicket.ticketedSeat.seatNumber' },
        { label: '座席セクション', default: '', value: 'reservedTicket.ticketedSeat.seatSection' },
        { label: '予約者タイプ', default: '', value: 'underName.typeOf' },
        { label: '予約者ID', default: '', value: 'underName.id' },
        { label: '予約者名称', default: '', value: 'underName.name' },
        { label: '予約者名', default: '', value: 'underName.givenName' },
        { label: '予約者性', default: '', value: 'underName.familyName' },
        { label: '予約者メールアドレス', default: '', value: 'underName.email' },
        { label: '予約者電話番号', default: '', value: 'underName.telephone' },
        { label: '予約者性別', default: '', value: 'underName.gender' },
        { label: '予約者住所', default: '', value: 'underName.address' },
        { label: '予約者年齢', default: '', value: 'underName.age' },
        { label: '予約者説明', default: '', value: 'underName.description' },
        { label: '予約者識別子', default: '', value: 'underName.identifier' }
    ];
    const opts = {
        fields: fields,
        delimiter: ',',
        eol: '\n',
        // flatten: true,
        // preserveNewLinesInValues: true,
    };

    const parser = new json2csv.Parser(opts);
    var csv = parser.parse(datas);
    const blob = string2blob(csv, { type: 'text/csv' });
    const fileName = 'reservations.csv';
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

function reservation2report(params) {
    const reservation = params.reservation;

    return {
        id: String(reservation.id),
        additionalTicketText: (typeof reservation.additionalTicketText === 'string') ? reservation.additionalTicketText : '',
        bookingTime: moment(reservation.bookingTime)
            .toISOString(),
        modifiedTime: moment(reservation.modifiedTime)
            .toISOString(),
        numSeats: String(reservation.numSeats),
        reservationFor: (reservation.reservationFor !== undefined && reservation.reservationFor !== null)
            ? {
                id: String(reservation.reservationFor.id),
                name: String(reservation.reservationFor.name.ja),
                startDate: moment(reservation.reservationFor.startDate)
                    .toISOString(),
                endDate: moment(reservation.reservationFor.endDate)
                    .toISOString()
            }
            : {
                id: '',
                name: '',
                startDate: '',
                endDate: ''
            },
        reservationNumber: String(reservation.reservationNumber),
        reservationStatus: String(reservation.reservationStatus),
        reservedTicket: (reservation.reservedTicket !== undefined
            && reservation.reservedTicket !== null
            && reservation.reservedTicket.ticketedSeat !== undefined
            && reservation.reservedTicket.ticketedSeat !== null
        )
            ? {
                ticketedSeat: {
                    seatNumber: String(reservation.reservedTicket.ticketedSeat.seatNumber),
                    seatSection: String(reservation.reservedTicket.ticketedSeat.seatSection)
                }
            }
            : {
                ticketedSeat: {
                    seatNumber: '',
                    seatSection: ''
                }
            },
        underName: (reservation.underName !== undefined && reservation.underName !== null)
            ? {
                typeOf: (typeof reservation.underName.typeOf === 'string') ? String(reservation.underName.typeOf) : '',
                name: (typeof reservation.underName.name === 'string') ? String(reservation.underName.name) : '',
                address: (typeof reservation.underName.address === 'string') ? String(reservation.underName.address) : '',
                age: (typeof reservation.underName.age === 'string') ? String(reservation.underName.age) : '',
                description: (typeof reservation.underName.description === 'string') ? String(reservation.underName.description) : '',
                email: (typeof reservation.underName.email === 'string') ? String(reservation.underName.email) : '',
                familyName: (typeof reservation.underName.familyName === 'string') ? String(reservation.underName.familyName) : '',
                gender: (typeof reservation.underName.gender === 'string') ? String(reservation.underName.gender) : '',
                givenName: (typeof reservation.underName.givenName === 'string') ? String(reservation.underName.givenName) : '',
                id: (typeof reservation.underName.id === 'string') ? String(reservation.underName.id) : '',
                identifier: (Array.isArray(reservation.underName.identifier)) ? JSON.stringify(reservation.underName.identifier) : '',
                telephone: (typeof reservation.underName.telephone === 'string') ? String(reservation.underName.telephone) : ''
            }
            : {
                typeOf: '',
                name: '',
                address: '',
                age: '',
                description: '',
                email: '',
                familyName: '',
                gender: '',
                givenName: '',
                id: '',
                identifier: '',
                telephone: ''
            },
        checkedIn: (typeof reservation.checkedIn === 'boolean') ? reservation.checkedIn : false,
        attended: (typeof reservation.attended === 'boolean') ? reservation.attended : false
    };
}
