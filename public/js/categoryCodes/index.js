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
    $(document).on('click', '.btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form');
        // 検索API呼び出し
        search(1);
    });

    $('.btn-ok').click();

    function search(pageNumber) {
        conditions['limit'] = ITEMS_ON_PAGE;
        conditions['page'] = pageNumber;
        var url = '/projects/' + PROJECT_ID + '/categoryCodes/search';

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

    $('#inCodeSet\\[identifier\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/categoryCodeSets',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    // name: { $regex: params.term },
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
                    results: data.map(function (categoryCodeSet) {
                        return {
                            id: categoryCodeSet.identifier,
                            text: categoryCodeSet.name
                        }
                    })
                };
            }
        }
    });

    var paymentMethodSelection = $('#paymentMethod\\[typeOf\\]');
    paymentMethodSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/paymentServices/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    typeOf: { $eq: 'MovieTicket' }
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
                    results: data.results.map(function (paymentService) {
                        return {
                            id: paymentService.serviceType.codeValue,
                            text: paymentService.name.ja
                        }
                    })
                };
            }
        }
    });

    // 追加特性を見る
    $(document).on('click', '.showAdditionalProperty', function (event) {
        var codeValue = $(this).attr('data-codeValue');
        console.log('showing additionalProperty...codeValue:', codeValue);

        showAdditionalProperty(codeValue);
    });
});

/**
 * 追加特性を見る
 */
function showAdditionalProperty(codeValue) {
    var categoryCode = $.CommonMasterList.getDatas().find(function (data) {
        return data.codeValue === codeValue
    });
    if (categoryCode === undefined) {
        alert('区分' + codeValue + 'が見つかりません');

        return;
    }

    var modal = $('#modal-categoryCode');
    var div = $('<div>')

    if (Array.isArray(categoryCode.additionalProperty)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(categoryCode.additionalProperty.map(function (property) {
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