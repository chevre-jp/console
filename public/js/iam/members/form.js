var memberId = '';

$(function () {
    memberId = $('input[name="member\[id\]"]').val();
    console.log('memberId:', memberId);

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');

        $('form').submit();
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
    $('.btn-delete').on('click', deleteById);

    $('#user').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/people',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    format: 'datatable',
                    email: params.term
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
                    results: data.results.map(function (user) {
                        return {
                            id: JSON.stringify(user),
                            text: '[' + user.Username + '] ' + user.givenName + ' ' + user.familyName
                        }
                    })
                };
            }
        }
    });

    // ロール更新
    var updateButton = $('button.update');
    $('#modal-update').on('shown.bs.modal', function () {
        $('#confirmUpdate').val('');
        updateButton.prop('disabled', true);
        updateButton.addClass('disabled');
    });
    $('#confirmUpdate').keyup(function () {
        var validValue = (String($(this).val()) === String($(this).data('expected')));
        if (validValue) {
            updateButton.prop('disabled', false);
            updateButton.removeClass('disabled');
        } else {
            updateButton.prop('disabled', true);
            updateButton.addClass('disabled');
        }
    });
    updateButton.click(function () {
        $(this).addClass('disabled')
            .text('processing...');

        $('form').submit();
    });
});

/**
 * 削除
 */
function deleteById() {
    if (window.confirm('元には戻せません。本当に削除しますか？')) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/iam/members/' + memberId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/iam/members';
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
