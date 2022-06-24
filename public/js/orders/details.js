var order;
$(function () {
    order = JSON.parse($('#jsonViewer textarea').val());

    // 返品
    var updateButton = $('button.returnOrder');
    $('#modal-return').on('shown.bs.modal', function () {
        $('#confirmReturn').val('');
        updateButton.prop('disabled', true);
        updateButton.addClass('disabled');
    });
    $('#confirmReturn').keyup(function () {
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
        var button = $(this);
        var originalButtonText = button.text();
        button.addClass('disabled')
            .text('processing...');

        $.ajax({
            url: '/projects/' + PROJECT_ID + '/orders/' + order.orderNumber + '/return',
            type: 'POST',
            // dataType: 'json',
            data: $('form', $('#modal-return')).serialize()
        })
            .done(function () {
                alert('返品処理を開始しました');
                location.reload();
            })
            .fail(function (xhr) {
                var res = $.parseJSON(xhr.responseText);
                alert('返品処理を開始できませんでした\n' + res.message);
            })
            .always(function () {
                button.removeClass('disabled')
                    .text(originalButtonText);
            });
    });
});

