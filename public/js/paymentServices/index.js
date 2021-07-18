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

    var conditions = {};
    $(document).on('click', '.searchProducts .btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form');
        // 検索API呼び出し
        search(1);
    });

    $(document).on('click', '.showAvailableChannel', function (event) {
        var id = $(this).attr('data-id');
        showAvailableChannel(id);
    });

    $(document).on('click', '.showServiceType', function (event) {
        var id = $(this).attr('data-id');
        showServiceType(id);
    });

    $(document).on('click', '.showProvider', function (event) {
        var id = $(this).attr('data-id');
        showProvider(id);
    });

    $('.btn-ok').click();

    $('#paymentMethodType').select2({
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
                    inCodeSet: { identifier: 'PaymentMethodType' }
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

    function search(pageNumber) {
        conditions['limit'] = ITEMS_ON_PAGE;
        conditions['page'] = pageNumber;
        var url = '/projects/' + PROJECT_ID + '/paymentServices/search';

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
                //alert("success:" + data.count);
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
});

function showAvailableChannel(id) {
    var product = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (product === undefined) {
        alert('プロダクト' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-product');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(product.availableChannel, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('AvailableChannel');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showServiceType(id) {
    var product = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (product === undefined) {
        alert('プロダクト' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-product');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(product.serviceType, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('serviceType');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showProvider(id) {
    var product = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (product === undefined) {
        alert('プロダクト' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-product');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(product.provider, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('Provider');
    modal.find('.modal-body').html(div);
    modal.modal();
}
