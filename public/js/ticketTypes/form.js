var offerId = '';

$(function () {
    offerId = $('input[name="id"]').val();

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');

        $('form').submit();
    });

    $("input#color").ColorPickerSliders({
        placement: 'bottom',
        color: '#333333',
        swatches: [
            '#333333', '#7F7F7F', '#7C1C20', '#DA413C',
            '#EF8641', '#FFEC32', '#5BA94A', '#3FA4E5',
            '#3458CA', '#9559A4', '#FFFFFF', '#C3C3C3',
            '#B07C5C', '#F3B5CB', '#F9C736', '#EFE2B3',
            '#C4DE2D', '#A6D8E8', '#7594BC', '#C5C3E6'
        ],
        customswatches: false,
        order: {},
        onchange: function (container, color) {
            $("#hiddenColor").text(color.tiny.toHexString());
            //$("#hiddenColor").text(color.tiny.toRgbString());
        }
    });

    if ($('.datepicker').length > 0) {
        $('.datepicker').datepicker({ language: 'ja' });
    }
    // if ($('.datetimepicker').length > 0) {
    //     $('.datetimepicker').datetimepicker({
    //         locale: 'ja',
    //         format: 'YYYY-MM-DDTHH:mm:ss+09:00'
    //     });
    // }

    // 削除ボタン
    $('.btn-delete').on('click', remove);

    $('#category').select2({
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#accounting').select2({
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
                    results: data.results.map(function (acconutTitle) {
                        return {
                            id: JSON.stringify({ codeValue: acconutTitle.codeValue, name: acconutTitle.name }),
                            text: acconutTitle.codeValue + ' ' + acconutTitle.name
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name, paymentMethod: categoryCode.paymentMethod }),
                            text: categoryCode.paymentMethod.typeOf + ' ' + categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#eligibleMonetaryAmount').select2({
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
                            text: categoryCode.name.ja
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#eligibleSubReservation').select2({
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('select[name=priceSpecification\\[referenceQuantity\\]\\[value\\]]').select2({
        placeholder: 'n',
        tags: true,
        createTag: function (params) {
            var term = $.trim(params.term);

            if (term === '') {
                return null;
            }

            if (isNaN(term)) {
                return null;
            }

            var referenceQuantityValue = Number(term);

            return {
                id: referenceQuantityValue,
                text: referenceQuantityValue,
                newTag: true // add additional parameters
            }
        }
    });

    $('#pointAwardCurrecy').select2({
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
                            id: JSON.stringify({ codeValue: categoryCode.codeValue, name: categoryCode.name }),
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

});

/**
 * 削除
 */
function remove() {
    if (window.confirm('元には戻せません。本当に削除しますか？')) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/offers/' + offerId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/offers';
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
