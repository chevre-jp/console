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

    // 検索ボタンイベント
    var conditions = {};
    $(document).on('click', '.btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form');
        // 検索API呼び出し
        search(1);
    });

    $(document).on('click', '.btn-downloadCSV', function () {
        onClickDownload();
    });

    $('.btn-ok').click();

    $(document).on('click', '.showOfferCatalog', function (event) {
        var id = $(this).attr('data-id');

        showOfferCatalog(id);
    });

    //--------------------------------
    // 検索API呼び出し
    //--------------------------------
    function search(pageNumber) {
        conditions['page'] = pageNumber;
        var url = '/projects/' + PROJECT_ID + '/offerCatalogs/getlist';
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
            alert("fail");
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }

    // 関連カタログ button
    $(document).on('click', '.popupListTicketType', function (event) {
        event.preventDefault();
        var id = $(this).attr('data-id');
        list(id);
    });

    /**
     * 関連カタログのpopupを表示
     */
    function list(id) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/offerCatalogs/' + id + '/offers',
            cache: false,
            type: 'GET',
            // data: conditions,
            beforeSend: function () {
                $('#loadingModal').modal({ backdrop: 'static' });
            }
        }).done(function (data) {
            if (data.success) {
                var offerCatalog = $.CommonMasterList.getDatas().find(function (data) {
                    return data.id === id
                });

                var modal = $('#modal-offerCatalog');

                var div = $('<div>');

                if (data.results.length > 0) {
                    var thead = $('<thead>').addClass('text-primary')
                        .append([
                            $('<tr>').append([
                                $('<th>').text('コード'),
                                $('<th>').text('名称')
                            ])
                        ]);
                    var tbody = $('<tbody>')
                        .append(data.results.map(function (result) {
                            var url = '/projects/' + PROJECT_ID + '/offers/' + result.id + '/update';
                            if (offerCatalog.itemOffered.typeOf === 'EventService') {
                                url = '/projects/' + PROJECT_ID + '/ticketTypes/' + result.id + '/update';
                            }

                            return $('<tr>').append([
                                $('<td>').html('<a target="_blank" href="' + url + '">' + result.identifier + ' <i class="material-icons" style="font-size: 1.2em;">open_in_new</i></a>'),
                                $('<td>').text(result.name.ja)
                            ]);
                        }))
                    var table = $('<table>').addClass('table table-sm')
                        .append([thead, tbody]);

                    div.addClass('table-responsive')
                        .append(table);
                } else {
                    div.append($('<p>').addClass('description text-center').text('データが見つかりませんでした'));
                }

                modal.find('.modal-title').text('対象オファー');
                modal.find('.modal-body').html(div);
                modal.modal();
            }
        }).fail(function (jqxhr, textStatus, error) {
            alert(error);
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }

    // 追加特性を見る
    $(document).on('click', '.showAdditionalProperty', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing additionalProperty...id:', id);

        showAdditionalProperty(id);
    });

    /**
     * 追加特性を見る
     */
    function showAdditionalProperty(id) {
        var catalog = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (catalog === undefined) {
            alert('カタログ' + id + 'が見つかりません');

            return;
        }

        var modal = $('#modal-offerCatalog');
        var div = $('<div>')

        if (Array.isArray(catalog.additionalProperty)) {
            var thead = $('<thead>').addClass('text-primary');
            var tbody = $('<tbody>');
            thead.append([
                $('<tr>').append([
                    $('<th>').text('Name'),
                    $('<th>').text('Value')
                ])
            ]);
            tbody.append(catalog.additionalProperty.map(function (property) {
                return $('<tr>').append([
                    $('<td>').text(property.name),
                    $('<td>').text(property.value)
                ]);
            }));
            var table = $('<table>').addClass('table table-sm')
                .append([thead, tbody]);
            div.addClass('table-responsive')
                .append(table);
        } else {
            div.append($('<p>').addClass('description text-center').text('データが見つかりませんでした'));
        }

        modal.find('.modal-title').text('追加特性');
        modal.find('.modal-body').html(div);
        modal.modal();
    }

    var serviceTypeSelection = $('#itemOffered\\[serviceType\\]\\[codeValue\\]\\[\\$eq\\]');
    serviceTypeSelection.select2({
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
                    inCodeSet: { identifier: 'ServiceType' }
                }

                // Query parameters will be ?search=[term]&type=public
                return query;
            },
            delay: 250, // wait 250 milliseconds before triggering the request
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
            processResults: function (data) {
                console.log(data);
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
});

function showOfferCatalog(id) {
    var offerCatalog = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (offerCatalog === undefined) {
        alert('カタログ' + id + 'が見つかりません');

        return;
    }

    var modal = $('#showModal');

    modal.find('a.edit')
        .off('click')
        .on('click', function () {
            var url = '/projects/' + PROJECT_ID + '/offerCatalogs/' + offerCatalog.id + '/update';
            window.open(url, '_blank');
        });

    modal.find('a.duplicateOfferCatalog')
        .off('click')
        .on('click', function () {
            var url = '/projects/' + PROJECT_ID + '/offerCatalogs/add?duplicateFrom=' + offerCatalog.id;
            window.open(url, '_blank');
        });

    var title = 'オファーカタログ `' + offerCatalog.id + '`';

    var body = $('<dl>').addClass('row');
    body.append($('<dt>').addClass('col-md-3').append('ID'))
        .append($('<dd>').addClass('col-md-9').append(offerCatalog.id))
        .append($('<dt>').addClass('col-md-3').append('コード'))
        .append($('<dd>').addClass('col-md-9').append(offerCatalog.identifier))
        .append($('<dt>').addClass('col-md-3').append('名称'))
        .append($('<dd>').addClass('col-md-9').append(offerCatalog.name.ja))
        .append($('<dt>').addClass('col-md-3').append('英語名称'))
        .append($('<dd>').addClass('col-md-9').append(offerCatalog.name.en))
        .append($('<dt>').addClass('col-md-3').append('補足説明'))
        .append($('<dd>').addClass('col-md-9').append(offerCatalog.description.ja))
        .append($('<dt>').addClass('col-md-3').append('英語補足説明'))
        .append($('<dd>').addClass('col-md-9').append(offerCatalog.description.en));

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

async function onClickDownload() {
    var conditions4csv = $.fn.getDataFromForm('form');

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
                        url: '/projects/' + PROJECT_ID + '/offerCatalogs/getlist',
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
            datas.push(...searchResult.results.map(function (offerCatalog) {
                return catalog2report({ offerCatalog });
            }));
        }

        if (searchResult.results.length < limit4download) {
            break;
        }
    }

    console.log(datas.length, 'reports found');
    $.notify({
        message: datas.length + '件のオファーカタログが見つかりました',
    }, {
        type: 'primary',
        delay: 2000,
        newest_on_top: true
    });

    const fields = [
        { label: 'コード', default: '', value: 'identifier' },
        { label: '名称', default: '', value: 'name.ja' },
        { label: 'アイテム', default: '', value: 'itemOfferedName' },
        { label: 'オファー数', default: '', value: 'offerCount' },
        { label: '追加特性', default: '', value: 'additionalProperty' },
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
    const fileName = 'offerCatalogs.csv';
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

function catalog2report(params) {
    const offerCatalog = params.offerCatalog;

    return offerCatalog;
}