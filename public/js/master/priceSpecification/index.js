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
    $(document).on('click', '.searchPriceSpecification .btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form');
        // 検索API呼び出し
        search(1);
    });

    $('.btn-ok').click();

    function search(pageNumber) {
        conditions['limit'] = ITEMS_ON_PAGE;
        conditions['page'] = pageNumber;
        var url = '/priceSpecifications/search';

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

    var appliesToCategoryCodeSelection = $('#appliesToCategoryCode\\[\\$elemMatch\\]');
    appliesToCategoryCodeSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/categoryCodes/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: {
                        identifier: {
                            $in: [
                                'SoundFormatType',
                                'VideoFormatType',
                                'SeatingType'
                            ]
                        }
                    }
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, inCodeSet: { identifier: categoryCode.inCodeSet.identifier } }),
                            text: categoryCode.inCodeSet.identifier + ' ' + categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    var appliesToMovieTicketSelection = $('#appliesToMovieTicket');
    appliesToMovieTicketSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/categoryCodes/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: {
                        identifier: {
                            $in: [
                                'MovieTicketType'
                            ]
                        }
                    }
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
                            text: categoryCode.paymentMethod.typeOf + ' ' + categoryCode.codeValue + ' ' + categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });
});
