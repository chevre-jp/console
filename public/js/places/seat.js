$(function () {
    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');
        $('form').submit();
    });

    // 削除ボタン
    $('.btn-delete').on('click', function () {
        var id = $(this).attr('data-id');

        remove(id);
    });

    var locationSelection = $('#movieTheater');
    locationSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/places/movieTheater/search',
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
                    results: data.results.map(function (place) {
                        return {
                            id: JSON.stringify({ id: place.id, branchCode: place.branchCode, name: place.name }),
                            text: place.name.ja
                        }
                    })
                };
            }
        }
    });

    var screenBranchCodeSelection = $('#screenBranchCode');
    screenBranchCodeSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'ルーム選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/places/screeningRoom/search',
            dataType: 'json',
            data: function (params) {
                var movieTheaterId;
                var locationSelectionValue = locationSelection.val();
                if (typeof locationSelectionValue === 'string' && locationSelectionValue.length > 0) {
                    try {
                        var selectedMovieTheater = JSON.parse(locationSelectionValue);
                        movieTheaterId = selectedMovieTheater.id;
                    } catch (error) {
                        console.error('JSON.parse(locationSelectionValue) throwed', error);
                    }
                }

                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    // 施設で絞る
                    containedInPlace: { id: { $eq: movieTheaterId } }
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
                    results: data.results.map(function (screeningRoom) {
                        return {
                            id: screeningRoom.branchCode,
                            text: screeningRoom.containedInPlace.name.ja + ' ' + screeningRoom.branchCode + ' ' + screeningRoom.name.ja
                        }
                    })
                };
            }
        }
    });

    var screeningRoomSectionBranchCodeSelection = $('#screeningRoomSectionBranchCode');
    screeningRoomSectionBranchCodeSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'セクション選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/places/screeningRoomSection/search',
            dataType: 'json',
            data: function (params) {
                var movieTheaterCode;
                var locationSelectionValue = locationSelection.val();
                if (typeof locationSelectionValue === 'string' && locationSelectionValue.length > 0) {
                    try {
                        var selectedMovieTheater = JSON.parse(locationSelectionValue);
                        movieTheaterCode = selectedMovieTheater.branchCode;
                    } catch (error) {
                        console.error('JSON.parse(locationSelectionValue) throwed', error);
                    }
                }

                var roomCode;
                var roomSelectionValue = screenBranchCodeSelection.val();
                if (typeof roomSelectionValue === 'string' && roomSelectionValue.length > 0) {
                    roomCode = roomSelectionValue;
                }

                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    // 施設で絞る
                    containedInPlace: {
                        branchCode: { $eq: roomCode },
                        containedInPlace: { branchCode: { $eq: movieTheaterCode } }
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
                    results: data.results.map(function (screeningRoomSection) {
                        return {
                            id: screeningRoomSection.branchCode,
                            text: screeningRoomSection.branchCode + ' ' + screeningRoomSection.name.ja
                        }
                    })
                };
            }
        }
    });


    var seatingTypeSelection = $('#seatingType');
    seatingTypeSelection.select2({
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
});

/**
 * 削除
 */
function remove(id) {
    if (window.confirm('元には戻せません。本当に削除しますか？')) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/places/seat/' + id,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/places/seat';
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
