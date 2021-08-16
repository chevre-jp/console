$(function () {
    var eventId = $('input[name=event]').val();

    $('#seatNumbers').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '座席選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + eventId + '/availableSeatOffers',
            dataType: 'json',
            data: function (params) {
                var seatSection = $('select[name=seatSection]').val();

                var query = {
                    seatSection: seatSection,
                    branchCode: {
                        $eq: params.term
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
                    results: data.map(function (seat) {
                        var disabled = true;
                        if (Array.isArray(seat.offers) && seat.offers.length > 0 && seat.offers[0].availability === 'InStock') {
                            disabled = false;
                        }

                        return {
                            id: seat.branchCode,
                            text: seat.containedInPlace.branchCode + ' ' + seat.branchCode,
                            disabled: disabled
                        }
                    })
                };
            }
        }
    });

    var result = $('#result');

    // File APIに対応しているか確認
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        function loadLocalCsv(e) {
            // ファイル情報を取得
            var fileData = e.target.files[0];
            console.log('file changed.', fileData);

            if (fileData === undefined) {
                // 表示データリセット
                result.html('');
                $('textarea[name=seatNumbersCsv]').val('');

                return;
            }

            // CSVファイル以外は処理を止める
            if (!fileData.name.match('.csv$')) {
                alert('CSVファイルを選択してください');

                return;
            }

            // FileReaderオブジェクトを使ってファイル読み込み
            var reader = new FileReader();
            // ファイル読み込みに成功したときの処理
            reader.onload = function () {
                var cols = reader.result.split('\n');
                var data = [];
                for (var i = 0; i < cols.length; i++) {
                    data[i] = cols[i].split(',');
                }
                var insert = createTable(data);

                result.html(insert);

                $('textarea[name=seatNumbersCsv]').val(reader.result);
            }
            // ファイル読み込みを実行
            reader.readAsText(fileData);
        }

        $(document).on('change', '#file', loadLocalCsv);

    } else {
        $('#file').hide();
        result.text('File APIに対応したブラウザでご確認ください');
    }

});

function createTable(data) {
    var table = $('<table>').addClass('table table-sm');
    for (var i = 0; i < data.length; i++) {
        var tr = $('<tr>');
        for (var j = 0; j < data[i].length; j++) {
            var td = $('<td>');
            td.text(data[i][j]);
            tr.append(td);
        }
        table.append(tr);
    }

    return table;
}
