
$(function () {
    var productId = $('input[name="id"]').val();

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
                url: '/projects/' + PROJECT_ID + '/paymentServices/' + productId,
                type: 'DELETE'
            }).done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/paymentServices';
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

    var providerSellerSelection = $('.providerSeller');
    providerSellerSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/sellers/getlist',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: params.term,
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
                            id: JSON.stringify({ typeOf: seller.typeOf, id: seller.id, name: seller.name }),
                            text: seller.name.ja
                        }
                    })
                };
            }
        }
    });

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
                            id: JSON.stringify(categoryCode),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });
});
