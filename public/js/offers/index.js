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

    $('.btn-ok').click();

    //--------------------------------
    // 検索API呼び出し
    //--------------------------------
    function search(pageNumber) {
        conditions['page'] = pageNumber;
        var url = '/projects/' + PROJECT_ID + '/offers/getlist';
        // alert(JSON.stringify(conditions));
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

    // オファー追加
    $(document).on('click', '.createOffer', function (event) {
        conditions = $.fn.getDataFromForm('form');
        var itemOfferedTypeOf = conditions['itemOffered[typeOf]'];
        if (typeof itemOfferedTypeOf !== 'string' || itemOfferedTypeOf.length === 0) {
            alert('アイテムを指定してください');

            return;
        }

        location.href = '/projects/' + PROJECT_ID + '/offers/add?itemOffered[typeOf]=' + itemOfferedTypeOf;
    });

    // 追加特性を見る
    $(document).on('click', '.showAdditionalProperty', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing additionalProperty...id:', id);

        showAdditionalProperty(id);
    });

    // カタログ表示
    $(document).on('click', '.showCatalogs', function (event) {
        event.preventDefault();
        var id = $(this).attr('data-id');
        showCatalogs(id);
    });

    // 利用可能アプリケーション表示
    $(document).on('click', '.showAvailableAtOrFrom', function (event) {
        event.preventDefault();
        var id = $(this).attr('data-id');
        showAvailableAtOrFrom(id);
    });

    $(document).on('click', '.showAddOn', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing addOn...id:', id);

        showAddOn(id);
    });

    $('#application').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
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

    $('#category\\[codeValue\\]').select2({
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
                    inCodeSet: { identifier: 'OfferCategoryType' }
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

    $('#appliesToMovieTicket').select2({
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
                    inCodeSet: { identifier: 'MovieTicketType' }
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, paymentMethod: categoryCode.paymentMethod }),
                            text: categoryCode.paymentMethod.typeOf + ' ' + categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#eligibleSeatingType').select2({
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
                    inCodeSet: { identifier: 'SeatingType' }
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

    $('#eligibleMembershipType').select2({
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

    $('#eligibleMonetaryAmount\\[currency\\]').select2({
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

    $('#accountTitle\\[codeValue\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/accountTitles/getlist',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
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
                    results: data.results.map(function (accountTitle) {
                        return {
                            id: accountTitle.codeValue,
                            text: accountTitle.name
                        }
                    })
                };
            }
        }
    });

    $('#addOn\\[itemOffered\\]\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/products/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    typeOf: { $eq: 'Product' },
                    page: 1,
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

    $(document).on('click', '.btn-downloadCSV', function () {
        onClickDownload();
    });

    /**
     * 追加特性を見る
     */
    function showAdditionalProperty(id) {
        var offer = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (offer === undefined) {
            alert('オファー' + id + 'が見つかりません');

            return;
        }

        var modal = $('#modal-offer');
        var div = $('<div>')

        if (Array.isArray(offer.additionalProperty)) {
            var thead = $('<thead>').addClass('text-primary');
            var tbody = $('<tbody>');
            thead.append([
                $('<tr>').append([
                    $('<th>').text('Name'),
                    $('<th>').text('Value')
                ])
            ]);
            tbody.append(offer.additionalProperty.map(function (property) {
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

    function showCatalogs(id) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/offers/' + id + '/catalogs',
            cache: false,
            type: 'GET',
            // data: conditions,
            beforeSend: function () {
                $('#loadingModal').modal({ backdrop: 'static' });
            }
        }).done(function (data) {
            if (data.success) {
                var modal = $('#modal-offer');

                var body = $('<p>').text('データが見つかりませんでした');
                if (data.results.length > 0) {
                    var tbody = $('<tbody>');
                    data.results.forEach(function (offerCatalog) {
                        var href = '/projects/' + PROJECT_ID + '/offerCatalogs/' + offerCatalog.id + '/update';
                        var identifier = $('<a>').attr({ 'href': href, target: '_blank' }).text(offerCatalog.identifier);
                        tbody.append(
                            $('<tr>')
                                .append($('<td>').html(identifier))
                                .append($('<td>').text(offerCatalog.name.ja))
                        );
                    });
                    var thead = $('<thead>').addClass('text-primary')
                        .append(
                            $('<tr>')
                                .append($('<th>').text('コード'))
                                .append($('<th>').text('名称'))
                        );
                    var table = $('<table>').addClass('table table-sm')
                        .append(thead)
                        .append(tbody)
                    body = $('<div>').addClass('table-responsive')
                        .append(table)
                }

                modal.find('.modal-title').text('関連カタログ');
                modal.find('.modal-body').html(body);
                modal.modal();
            }
        }).fail(function (jqxhr, textStatus, error) {
            alert(error);
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }

    function showAvailableAtOrFrom(id) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/offers/' + id + '/availableApplications',
            cache: false,
            type: 'GET',
            // data: conditions,
            beforeSend: function () {
                $('#loadingModal').modal({ backdrop: 'static' });
            }
        }).done(function (data) {
            if (data.success) {
                var modal = $('#modal-offer');

                var body = $('<p>').text('データが見つかりませんでした');
                if (data.results.length > 0) {
                    var tbody = $('<tbody>');
                    data.results.forEach(function (application) {
                        tbody.append(
                            $('<tr>')
                                .append($('<td>').text(application.id))
                                .append($('<td>').text(application.name))
                        );
                    });
                    var thead = $('<thead>').addClass('text-primary')
                        .append(
                            $('<tr>')
                                .append($('<th>').text('ID'))
                                .append($('<th>').text('名称'))
                        );
                    var table = $('<table>').addClass('table table-sm')
                        .append(thead)
                        .append(tbody)
                    body = $('<div>').addClass('table-responsive')
                        .append(table)
                }

                modal.find('.modal-title').text('利用可能アプリケーション');
                modal.find('.modal-body').html(body);
                modal.modal();
            }
        }).fail(function (jqxhr, textStatus, error) {
            alert(error);
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }

    function showAddOn(id) {
        var offer = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (offer === undefined) {
            alert('オファー' + id + 'が見つかりません');

            return;
        }

        var modal = $('#modal-offer');
        var div = $('<div>')

        if (Array.isArray(offer.addOn)) {
            var thead = $('<thead>').addClass('text-primary');
            var tbody = $('<tbody>');
            thead.append([
                $('<tr>').append([
                    $('<th>').text('名称')
                ])
            ]);
            tbody.append(offer.addOn.map(function (offer) {
                var href = '/projects/' + PROJECT_ID + '/products/' + offer.itemOffered.id;
                return $('<tr>').append([
                    $('<td>').html($('<a>').attr({ href, href, target: '_blank' }).text(offer.itemOffered.name.ja))
                ]);
            }));
            var table = $('<table>').addClass('table table-sm')
                .append([thead, tbody]);
            div.addClass('table-responsive')
                .append(table);
        } else {
            div.append($('<p>').addClass('description text-center').text('データが見つかりませんでした'));
        }

        modal.find('.modal-title').text('アドオン');
        modal.find('.modal-body').html(div);
        modal.modal();
    }

    // COA券種インポート
    $('a.importFromCOA').click(function () {
        var message = 'COA券種をインポートしようとしています。'
            + '\nよろしいですか？';

        if (window.confirm(message)) {
            $.ajax({
                url: '/projects/' + PROJECT_ID + '/ticketTypes/importFromCOA',
                type: 'POST',
                dataType: 'json',
                data: $('form').serialize()
            }).done(function (tasks) {
                console.log(tasks);
                alert('インポートを開始しました');
            }).fail(function (xhr) {
                var res = $.parseJSON(xhr.responseText);
                alert(res.error.message);
            }).always(function () {
            });
        } else {
        }
    });
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
                        url: '/projects/' + PROJECT_ID + '/offers/getlist',
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
            datas.push(...searchResult.results.map(function (offer) {
                return offer2report({ offer });
            }));
        }

        if (searchResult.results.length < limit4download) {
            break;
        }
    }

    console.log(datas.length, 'reports found');
    $.notify({
        message: datas.length + '件のオファーが見つかりました',
    }, {
        type: 'primary',
        delay: 2000,
        newest_on_top: true
    });

    const fields = [
        { label: 'ID', default: '', value: 'id' },
        { label: 'コード', default: '', value: 'identifier' },
        { label: 'カテゴリー', default: '', value: 'category.codeValue' },
        { label: '提供アイテムタイプ', default: '', value: 'itemOffered.typeOf' },
        { label: '名称', default: '', value: 'name.ja' },
        { label: '発生金額', default: '', value: 'priceSpecification.price' },
        { label: '単価参照数量', default: '', value: 'priceSpecification.referenceQuantity.value' },
        { label: '単価参照数量単位', default: '', value: 'priceSpecification.referenceQuantity.unitCode' },
        { label: '売上金額', default: '', value: 'priceSpecification.accounting.accountsReceivable' },
        { label: '細目コード', default: '', value: 'priceSpecification.accounting.operatingRevenue.codeValue' },
        { label: '追加特性', default: '', value: 'additionalProperty' },
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
    var csv = parser.parse(datas);
    const blob = string2blob(csv, { type: 'text/csv' });
    const fileName = 'offers.csv';
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

function offer2report(params) {
    const offer = params.offer;

    return {
        id: String(offer.id),
        identifier: String(offer.identifier),
        itemOffered: offer.itemOffered,
        name: offer.name,
        priceSpecification: offer.priceSpecification,
        category: offer.category,
        additionalProperty: (Array.isArray(offer.additionalProperty)) ? JSON.stringify(offer.additionalProperty) : ''
    };
}
