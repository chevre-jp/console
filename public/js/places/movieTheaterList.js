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

    //--------------------------------
    // 検索API呼び出し
    //--------------------------------
    function search(pageNumber) {
        conditions['page'] = pageNumber;
        var url = '/projects/' + PROJECT_ID + '/places/movieTheater/search';
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

    var parentOrganizationSelection = $('#parentOrganization\\[id\\]');
    parentOrganizationSelection.select2({
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

    // 追加特性を見る
    $(document).on('click', '.showAdditionalProperty', function (event) {
        var id = $(this).attr('data-id');

        showAdditionalProperty(id);
    });

    // ルーム情報
    $(document).on('click', '.showContainsPlace', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing containsPlace...id:', id);

        showContainsPlace(id);
    });

    // ルーム情報
    $(document).on('click', '.showHasPOS', function (event) {
        var id = $(this).attr('data-id');

        showHasPOS(id);
    });

    /**
     * 追加特性を見る
     */
    function showAdditionalProperty(id) {
        var movieTheater = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (movieTheater === undefined) {
            alert('施設' + id + 'が見つかりません');

            return;
        }

        var modal = $('#modal-place');
        var div = $('<div>')

        if (Array.isArray(movieTheater.additionalProperty)) {
            var thead = $('<thead>').addClass('text-primary');
            var tbody = $('<tbody>');
            thead.append([
                $('<tr>').append([
                    $('<th>').text('Name'),
                    $('<th>').text('Value')
                ])
            ]);
            tbody.append(movieTheater.additionalProperty.map(function (property) {
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

    /**
     * ルーム情報
     */
    function showContainsPlace(id) {
        var movieTheater = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (movieTheater === undefined) {
            alert('施設' + id + 'が見つかりません');

            return;
        }

        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/places/movieTheater/' + id + '/screeningRooms',
            cache: false,
            type: 'GET',
            data: conditions,
            beforeSend: function () {
                $('#loadingModal').modal({ backdrop: 'static' });
            }
        }).done(function (data) {
            console.log(data);
            if (data.success) {
                var modal = $('#modal-containsPlace');
                var body = modal.find('.modal-body');

                var thead = $('<thead>').addClass('text-primary')
                    .append([
                        $('<tr>').append([
                            $('<th>').text('コード'),
                            $('<th>').text('名称'),
                            $('<th>').text('セクション数'),
                            $('<th>').text('座席数')
                        ])
                    ]);
                var tbody = $('<tbody>')
                    .append(data.results.map(function (result) {
                        var screeningRoomId = movieTheater.branchCode + ':' + result.branchCode;
                        var editScreenUrl = '/projects/' + PROJECT_ID + '/places/screeningRoom/' + screeningRoomId + '/update';
                        var numSections = 0;
                        if (Array.isArray(result.containsPlace)) {
                            numSections = result.containsPlace.length;
                        }

                        return $('<tr>').append([
                            $('<td>').html('<a target="_blank" href="' + editScreenUrl + '">' + result.branchCode + ' <i class="material-icons" style="font-size: 1.2em;">open_in_new</i></a>'),
                            $('<td>').text(result.name),
                            $('<td>').text(numSections),
                            $('<td>').text(result.numSeats)
                        ]);
                    }))
                var table = $('<table>').addClass('table table-sm')
                    .append([thead, tbody]);

                var div = $('<div>').addClass('')
                    .append(table);

                body.empty().append(div);
                modal.modal();
            }
        }).fail(function (jqxhr, textStatus, error) {
            alert("fail");
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }

    function showHasPOS(id) {
        var movieTheater = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (movieTheater === undefined) {
            alert('施設' + id + 'が見つかりません');

            return;
        }

        var modal = $('#modal-place');

        var thead = $('<thead>').addClass('text-primary')
            .append([
                $('<tr>').append([
                    $('<th>').text('コード'),
                    $('<th>').text('名称')
                ])
            ]);
        var tbody = $('<tbody>');
        if (Array.isArray(movieTheater.hasPOS)) {
            tbody.append(movieTheater.hasPOS.map(function (pos) {
                return $('<tr>').append([
                    $('<td>').text(pos.id),
                    $('<td>').text(pos.name)
                ]);
            }))
        }
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);

        var div = $('<div>').addClass('')
            .append(table);

        modal.find('.modal-title').text('POS');
        modal.find('.modal-body').html(div);
        modal.modal();
    }
});

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
                        url: '/projects/' + PROJECT_ID + '/places/movieTheater/search',
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
            datas.push(...searchResult.results.map(function (place) {
                return place2report({ place });
            }));
        }

        if (searchResult.results.length < limit4download) {
            break;
        }
    }

    console.log(datas.length, 'reports found');
    $.notify({
        message: datas.length + '件の施設が見つかりました',
    }, {
        type: 'primary',
        delay: 2000,
        newest_on_top: true
    });

    const fields = [
        { label: 'コード', default: '', value: 'branchCode' },
        { label: '名称', default: '', value: 'name.ja' },
        { label: '電話番号', default: '', value: 'telephone' },
        { label: 'URL', default: '', value: 'url' },
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
    const fileName = 'movieTheaters.csv';
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

function place2report(params) {
    const place = params.place;

    return place;
}