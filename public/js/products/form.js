
$(function () {
    var productId = $('input[name="id"]').val();
    var productType = $('#typeOf').val();

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');

        $('form').submit();
    });

    // 削除ボタン
    $('.btn-delete').on('click', function () {
        if (window.confirm('元には戻せません。本当に削除しますか？')) {
            $.ajax({
                dataType: 'json',
                url: '/projects/' + PROJECT_ID + '/products/' + productId,
                type: 'DELETE'
            }).done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/products?typeOf=' + productType;
            }).fail(function (jqxhr, textStatus, error) {
                var message = '削除できませんでした';
                if (jqxhr.responseJSON != undefined && jqxhr.responseJSON.error != undefined) {
                    message += ': ' + jqxhr.responseJSON.error.message;
                }
                alert(message);
            }).always(function () {
            });
        } else {
        }
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

    var serviceOutputCategoryIdentifier = 'noexistingType';
    if (productType === 'EventService') {
        serviceOutputCategoryIdentifier = 'ServiceType';
    } else if (productType === 'MembershipService') {
        serviceOutputCategoryIdentifier = 'MembershipType';
    } else if (productType === 'PaymentCard') {
        serviceOutputCategoryIdentifier = 'PaymentMethodType';
    }

    $('#serviceType').select2({
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
                    inCodeSet: { identifier: serviceOutputCategoryIdentifier }
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
                            id: JSON.stringify(categoryCode),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#serviceOutputAmount').select2({
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
            processResults: function (data, params) {
                // movieOptions = data.data;

                var defaultResults = [];
                if (typeof params.term !== 'string' || params.term.length === 0) {
                    defaultResults.push({ id: JSON.stringify({ codeValue: 'JPY', name: { ja: 'JPY' } }), text: 'JPY' });
                }
                data.results.forEach(function (categoryCode) {
                    defaultResults.push({
                        id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
                        text: categoryCode.name.ja
                    });
                });


                // Transforms the top-level key of the response object from 'items' to 'results'
                return {
                    results: defaultResults
                };
            }
        }
    });
});
