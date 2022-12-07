var placeId = '';

$(function () {
    placeId = $('input[name="id"]').val();

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');
        $('form').submit();
    });
    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    })

    // 削除ボタン
    $('.btn-delete').on('click', remove);

    var parentOrganizationSelection = $('#parentOrganization');
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
                            id: JSON.stringify({ id: seller.id, name: seller.name }),
                            text: seller.name.ja
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
            url: '/projects/' + PROJECT_ID + '/places/movieTheater/' + placeId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/places/movieTheater';
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
