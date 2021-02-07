var priceSpecificationId = '';

$(function () {
    priceSpecificationId = $('input[name="id"]').val();

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');

        $('form').submit();
    });
    // datepickerセット
    if ($('.datepicker').length > 0) {
        $('.datepicker').datepicker({ language: 'ja' });
    }
    if ($('.datetimepicker').length > 0) {
        $('.datetimepicker').datetimepicker({
            locale: 'ja',
            format: 'YYYY-MM-DDTHH:mm:ss+09:00'
        });
    }

    $(document).on('change', 'select[name="typeOf"]', function () {
        showAppliesToConditions($(this).val());
    });

    showAppliesToConditions($('select,input[name="typeOf"]').val());

    // 削除ボタン
    $('.btn-delete').on('click', remove);

    var appliesToCategoryCodeSelection = $('#appliesToCategoryCode');
    appliesToCategoryCodeSelection.select2({
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
                // movieOptions = data.data;

                // Transforms the top-level key of the response object from 'items' to 'results'
                return {
                    results: data.results.map(function (categoryCode) {
                        return {
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, inCodeSet: categoryCode.inCodeSet, name: categoryCode.name }),
                            text: categoryCode.name.ja
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
            url: '/projects/' + PROJECT_ID + '/categoryCodes/search',
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
                // movieOptions = data.data;

                // Transforms the top-level key of the response object from 'items' to 'results'
                return {
                    results: data.results.map(function (categoryCode) {
                        return {
                            id: JSON.stringify({
                                codeValue: categoryCode.codeValue,
                                inCodeSet: categoryCode.inCodeSet,
                                name: categoryCode.name,
                                paymentMethod: categoryCode.paymentMethod
                            }),
                            text: categoryCode.inCodeSet.identifier + ' ' + categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    var appliesToVideoFormatSelection = $('#appliesToVideoFormat');
    appliesToVideoFormatSelection.select2({
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
                    inCodeSet: {
                        identifier: {
                            $in: [
                                'VideoFormatType'
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
                // movieOptions = data.data;

                // Transforms the top-level key of the response object from 'items' to 'results'
                return {
                    results: data.results.map(function (categoryCode) {
                        return {
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, inCodeSet: categoryCode.inCodeSet, name: categoryCode.name }),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });
});

/**
 * 価格仕様タイプに応じた適用条件フォームを表示する
 */
function showAppliesToConditions(priceSpecificationType) {
    $('.appliesToConditions').addClass('d-none');
    if (typeof priceSpecificationType === 'string' && priceSpecificationType.length > 0) {
        $('.appliesToConditions.' + priceSpecificationType).removeClass('d-none');
    }
}

/**
 * 削除
 */
function remove() {
    if (window.confirm('元には戻せません。本当に削除しますか？')) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/priceSpecifications/' + priceSpecificationId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/priceSpecifications';
            })
            .fail(function (jqxhr, textStatus, error) {
                var message = '削除できませんでした';
                if (jqxhr.responseJSON != undefined && jqxhr.responseJSON.error != undefined) {
                    message += ': ' + jqxhr.responseJSON.error.message;
                }
                alert(message);
            })
            .always(function () {
            });
    }
}
