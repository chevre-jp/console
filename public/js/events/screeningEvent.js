/**
 * スケジュール作成中かどうか
 */
var creatingSchedules = false;
var scheduler;
var ITEMS_ON_PAGE;
var conditions = {};
var SEARCH_URL;
var locationSelection;
/**
 * イベント編集モーダル
 */
var editModal;
/**
 * イベント作成モーダル
 */
var newModal;

$(function () {
    newModal = $('#modal4newEvent');
    editModal = $('#modal4editEvent');
    SEARCH_URL = '/projects/' + PROJECT_ID + '/events/screeningEvent/search';
    locationSelection = $('#screen');
    ITEMS_ON_PAGE = Number($('input[name="limit"]').val());

    // 開催日
    $('.search form input[name=date]')
        .val(moment().tz('Asia/Tokyo').format('YYYY/MM/DD'));
    // $('input[name="screeningDateStart"]', newModal)
    //     .val(moment().tz('Asia/Tokyo').format('YYYY/MM/DD'));
    // $('input[name="screeningDateThrough"]', newModal)
    //     .val(moment().tz('Asia/Tokyo').format('YYYY/MM/DD'));

    // timepickerセット
    if ($('.timepicker').length > 0) {
        $('.timepicker').timepicker({
            step: 5,
            timeFormat: 'H:i',
            // interval: 60,
            // minTime: '10',
            // maxTime: '6:00pm',
            // defaultTime: '11',
            // startTime: '10:00',
            // dynamic: false,
            // dropdown: true,
            // scrollbar: true
        })
    }

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    });

    // 共通一覧表示初期セット・ページャセット
    $.CommonMasterList.init('#templateRow', '#searchedCount');
    $.CommonMasterList.pager('#pager', ITEMS_ON_PAGE, function (pageNumber) {
        search(pageNumber);
    });

    //スケジューラー初期化
    scheduler = createScheduler();

    searchSchedule();

    // 検索
    $(document).on('click', '.search-button', searchSchedule);
    // 新規作成
    $(document).on('click', '.new-button', createNewEvent);
    // 新規登録（確定）
    $(document).on('click', '.regist-button', regist);
    // 更新（確定）
    $(document).on('click', '.update-button', update);
    // 削除ボタンの処理
    $(document).on('click', '.delete-button', deletePerformance);

    // 絶対・相対切り替え
    $(document).on('change', 'input[name=onlineDisplayType], input[name=saleStartDateType], input[name=saleEndDateType]', changeInputType)

    // 施設検索条件変更イベント
    $(document).on('change', '.search select[name="theater"]', _.debounce(function () {
        initializeLocationSelection();
    }, 500));

    newModal.on('change', 'select[name="superEvent"]', function () {
        var mvtkFlg = $(this).find('option:selected').attr('data-mvtk-flag');
        if (mvtkFlg !== '1') {
            // 強制的にムビチケ決済不可に設定
            $('input[name=mvtkExcludeFlg]', newModal).prop('checked', true);
            $('.mvtk', newModal).hide();
        } else {
            $('input[name=mvtkExcludeFlg]', newModal).prop('checked', false);
            $('.mvtk', newModal).show();
        }
    });

    // 作成モーダルの施設選択イベント
    newModal.on('change', 'select[name="theater"]', _.debounce(function () {
        var theater = $(this).val();
        // var sellerId = $(this).find('option:selected').attr('data-seller');

        // 販売者を検索して、選択肢にセットする
        // getSeller(sellerId);
        initializeScreenSelection(theater);
        initializeSuperEventSelection(theater);
    }, 500));

    $(document).on('change', '.search input[name="date"]', _.debounce(function () {
        // var theater = $('.search select[name=theater]').val();
        // var date = $(this).val();
    }, 500));

    var target = [
        'input[name="doorTime"]',
        'input[name="startTime"]',
        'input[name="endTime"]',
        'select[name="itemOfferedProductId"]',
        'select[name="itemOffered"]',
        'select[name="ticketTypeGroup"]'
    ];
    $(document).on(
        'change',
        target.join(', '),
        function () {
            $(this).parents('.timeTable').attr('data-dirty', true);
        }
    );

    // COAイベントインポート
    $(document).on('click', 'a.importFromCOA', function (event) {
        var theater = $('.search select[name=theater]').val();
        if (!theater) {
            alert('施設を選択してください');

            return;
        }

        var message = '施設:' + theater + 'のCOAイベントをインポートしようとしています。'
            + '\nよろしいですか？';

        if (window.confirm(message)) {
            $.ajax({
                url: '/projects/' + PROJECT_ID + '/events/screeningEvent/importFromCOA',
                type: 'POST',
                dataType: 'json',
                data: $('.search form').serialize()
            }).done(function (tasks) {
                console.log(tasks);
                alert('インポートを開始しました');
            }).fail(function (xhr) {
                var res = $.parseJSON(xhr.responseText);
                alert(res.error.message);
            }).always(function () {
            });
        } else {
        }
    });

    $(document).on('click', '.showOffers', function (event) {
        var id = $(this).attr('data-id');

        showOffersById(id);
    });

    $(document).on('click', '.showOffersJson', function (event) {
        var id = $(this).attr('data-id');

        showOffersJson(id);
    });

    $(document).on('click', '.searchUpdateActions', function (event) {
        var id = $(this).attr('data-id');

        searchUpdateActionsById(id);
    });

    $(document).on('click', '.showAdditionalProperty', function (event) {
        var id = $(this).attr('data-id');

        showAdditionalProperty(id);
    });

    $(document).on('click', '.showPerformance', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing event...id:', id);

        showPerformance(id);
    });

    $('.search select[name="theater"]').select2({
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
                    results: data.results.map(function (movieTheater) {
                        return {
                            id: movieTheater.id,
                            text: movieTheater.name.ja
                        }
                    })
                };
            }
        }
    });

    locationSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/places/screeningRoom/search',
            dataType: 'json',
            data: function (params) {
                var movieTheaterId = $('.search select[name="theater"]').val();
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    containedInPlace: {
                        id: { $eq: movieTheaterId }
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
                    results: data.results.map(function (place) {
                        return {
                            id: place.branchCode,
                            text: place.name.ja
                        }
                    })
                };
            }
        }
    });

    var movieSelection = $('#superEvent\\[workPerformed\\]\\[identifier\\]');
    movieSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/creativeWorks/movie/getlist',
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
                    results: data.results.map(function (movie) {
                        return {
                            id: movie.identifier,
                            text: movie.name
                        }
                    })
                };
            }
        }
    });

    // カタログ検索条件
    $('#hasOfferCatalog\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/offerCatalogs/getlist',
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
                    results: data.results.map(function (offerCatalog) {
                        return {
                            id: offerCatalog.id,
                            text: offerCatalog.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#itemOffered\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/products/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: params.term,
                    typeOf: { $eq: 'EventService' },
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
                    results: data.results.map(function (product) {
                        return {
                            id: product.id,
                            text: product.name.ja
                        }
                    })
                };
            }
        }
    });

    $('select[name=endDayRelative]').select2({
        placeholder: 'n日後',
        tags: true,
        createTag: function (params) {
            var term = $.trim(params.term);

            if (term === '') {
                return null;
            }

            if (isNaN(term)) {
                return null;
            }

            var relativeDay = Number(term);

            return {
                id: relativeDay,
                text: relativeDay + '日後',
                newTag: true // add additional parameters
            }
        }
    });

    // カタログではなくプロダクト検索に変更
    // $('select[name="itemOffered"]').select2({
    //     // width: 'resolve', // need to override the changed default,
    //     placeholder: '興行選択',
    //     allowClear: true,
    //     ajax: {
    //         url: '/projects/' + PROJECT_ID + '/offerCatalogs/getlist',
    //         dataType: 'json',
    //         data: function (params) {
    //             var query = {
    //                 limit: 100,
    //                 page: 1,
    //                 name: params.term,
    //                 itemOffered: {
    //                     typeOf: { $eq: 'EventService' }
    //                 }
    //             }

    //             // Query parameters will be ?search=[term]&type=public
    //             return query;
    //         },
    //         delay: 250, // wait 250 milliseconds before triggering the request
    //         // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
    //         processResults: function (data) {
    //             // movieOptions = data.data;

    //             // Transforms the top-level key of the response object from 'items' to 'results'
    //             return {
    //                 results: data.results.map(function (offerCatalog) {
    //                     return {
    //                         id: offerCatalog.id,
    //                         text: offerCatalog.name.ja
    //                     }
    //                 })
    //             };
    //         }
    //     }
    // });

    $('select[name="itemOfferedProductId"]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '興行選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/products/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: params.term,
                    typeOf: { $eq: 'EventService' },
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
                    results: data.results.map(function (product) {
                        return {
                            id: product.id,
                            text: product.name.ja
                        }
                    })
                };
            }
        }
    });

    $('select[name="theater"]', newModal).select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        templateSelection: function (data, container) {
            // Add custom attributes to the <option> tag for the selected option
            $(data.element).attr({
                'data-max-seat-number': data['data-max-seat-number'],
                'data-sale-start-days': data['data-sale-start-days'],
                'data-end-sale-time': data['data-end-sale-time'],
                'data-name': data['data-name'],
                'data-seller': data['data-seller'],
            });

            return data.text;
        },
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
                    results: data.results.map(function (movieTheater) {
                        return {
                            id: movieTheater.id,
                            text: movieTheater.name.ja,
                            'data-max-seat-number': movieTheater.offers.eligibleQuantity.maxValue,
                            'data-sale-start-days': -Number(movieTheater.offers.availabilityStartsGraceTime.value),
                            'data-end-sale-time': Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60),
                            'data-name': movieTheater.name.ja,
                            'data-seller': movieTheater.parentOrganization.id
                        }
                    })
                };
            }
        }
    });

    $('#availableAtOrFromId').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/applications/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    name: params.term,
                    hasRole: { roleName: { $eq: 'customer' } }
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
                    results: data.results.map(function (application) {
                        return {
                            id: application.id,
                            text: application.name
                        }
                    })
                };
            }
        }
    });

    var additionalPropertyNameSelection = $('.additionalPropertyNameSelection');
    additionalPropertyNameSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/additionalProperties/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: { identifier: 'ScreeningEvent' }
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
                    results: data.results.map(function (additionalProperty) {
                        return {
                            id: additionalProperty.codeValue,
                            text: additionalProperty.codeValue + ' (' + additionalProperty.name.ja + ')'
                        }
                    })
                };
            }
        }
    });
});

// function getSeller(sellerId) {
//     if (!sellerId) {
//         return;
//     }

//     var sellerSelection = $('select[name="seller"]', newModal);
//     sellerSelection.html('<option selected disabled>検索中...</option>')
//     $.ajax({
//         dataType: 'json',
//         url: '/projects/' + PROJECT_ID + '/sellers/' + sellerId,
//         type: 'GET',
//         data: {}
//     }).done(function (seller) {
//         console.log('seller found', seller);
//         var options = ['<option selected="selected" value="' + seller.id + '">' + seller.name.ja + '</option>'];
//         sellerSelection.html(options);
//     }).fail(function (jqxhr, textStatus, error) {
//         alert('販売者を検索できませんでした。施設を再選択してください。');
//     });
// }

function initializeLocationSelection() {
    locationSelection.val(null)
        .trigger('change');
}

function initializeSuperEventSelection(theater) {
    if (!theater) {
        return;
    }

    var superEventSelection = $('#superEvent');
    superEventSelection.val(null).trigger('change');
    superEventSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        templateSelection: function (data, container) {
            // Add custom attributes to the <option> tag for the selected option
            $(data.element).attr({
                'data-mvtk-flag': data['data-mvtk-flag'],
                'data-startDate': data['data-startDate'],
                'data-endDate': data['data-endDate'],
            });

            return data.text;
        },
        ajax: {
            cache: false,
            url: '/projects/' + PROJECT_ID + '/events/screeningEventSeries/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    locationId: theater,
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
                    results: data.results.map(function (eventSeries) {
                        return {
                            id: eventSeries.id,
                            text: eventSeries.filmNameJa,
                            'data-mvtk-flag': eventSeries.mvtkFlg,
                            'data-startDate': eventSeries.startDate,
                            'data-endDate': eventSeries.endDate
                        }
                    })
                };
            }
        }
    });
}

function initializeScreenSelection(theater) {
    if (!theater) {
        return;
    }

    var screenSelection = $('select[name="screen"]', newModal);
    screenSelection.val(null).trigger('change');
    screenSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/places/screeningRoom/search',
            // url: '/places/movieTheater/' + theater + '/screeningRooms',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    containedInPlace: { id: { $eq: theater } },
                    name: { $regex: params.term },
                    $projection: {
                        sectionCount: 1,
                        seatCount: 1
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
                    results: data.results.map(function (screeningRoom) {
                        var text = screeningRoom.name.ja;
                        if (typeof screeningRoom.seatCount === 'number') {
                            text += ' (' + screeningRoom.seatCount + '席)'
                        }
                        return {
                            id: screeningRoom.branchCode,
                            text: text
                        }
                    })
                };
            }
        }
    });
}

function getWeekDayData() {
    var weekDayData = $('input[name="weekDay"]:checked', newModal);
    if (weekDayData.length === 0) {
        return [];
    }
    var result = [];
    weekDayData.each(function () {
        result.push($(this).val());
    });
    return result;
}

/**
 * 登録スケジュールのタイムテーブルを取得する
 */
function getTableData() {
    var tempData = [];
    var timeTableData = $('.timeTable[data-dirty="true"]', newModal);
    var repeatableTimeTable = $('.repeatableTimeTable', newModal);

    const staicTimeTablePanel = $('.staicTimeTablePanel').hasClass('active');
    const repeatableTimeTablePanel = $('.repeatableTimeTablePanel').hasClass('active');

    if (staicTimeTablePanel) {
        timeTableData.each(function (_, row) {
            const mvtkExcludeFlg = $(row).find('input[name="mvtkExcludeFlg"]:checked').val() === undefined ? 0 : $(row).find('input[name="mvtkExcludeFlg"]:checked').val();
            var o = {
                doorTime: $(row).find('input[name="doorTime"]').val(),
                startTime: $(row).find('input[name="startTime"]').val(),
                endTime: $(row).find('input[name="endTime"]').val(),
                endDayRelative: Number($(row).find('select[name="endDayRelative"]').val()),
                ticketTypeGroup: $(row).find('select[name="itemOfferedProductId"]').val(),
                mvtkExcludeFlg: mvtkExcludeFlg
            };

            var isValidRow = true;

            // 入力していない情報があればNG
            if (
                typeof o.doorTime !== 'string' || o.doorTime.length === 0 ||
                typeof o.startTime !== 'string' || o.startTime.length === 0 ||
                typeof o.endTime !== 'string' || o.endTime.length === 0 ||
                typeof o.endDayRelative !== 'number' || String(o.endDayRelative).length === 0 ||
                typeof o.ticketTypeGroup !== 'string' || o.ticketTypeGroup.length === 0
            ) {
                isValidRow = false;
            }

            if (isValidRow) {
                console.log('adding timeTable...', o);
                tempData.push(o);
            }
        });
    }

    if (repeatableTimeTablePanel) {
        repeatableTimeTable.each(function (_, row) {
            var repeatEveryMinutes = $(row).find('input[name="repeatEveryMinutes"]').val();
            var repeatFrom = $(row).find('input[name="repeatFrom"]').val();
            var repeatThrough = $(row).find('input[name="repeatThrough"]').val();
            var ticketTypeGroup = $(row).find('select[name="itemOfferedProductId"]').val();

            var isValidRow = true;

            // 入力していない情報があればNG
            if (
                typeof repeatEveryMinutes !== 'string' || repeatEveryMinutes.length === 0 ||
                typeof repeatFrom !== 'string' || repeatFrom.length === 0 ||
                typeof repeatThrough !== 'string' || repeatThrough.length === 0 ||
                typeof ticketTypeGroup !== 'string' || ticketTypeGroup.length === 0
            ) {
                isValidRow = false;
            }

            if (isValidRow) {
                var endDate = moment('2020-05-16T' + repeatFrom + ':00+09:00');
                var startThrough = moment('2020-05-16T' + repeatThrough + ':00+09:00');
                while (endDate <= startThrough) {
                    endDate.add(Number(repeatEveryMinutes), 'minutes');

                    tempData.push({
                        doorTime: moment(endDate).add(-Number(repeatEveryMinutes), 'minutes').tz('Asia/Tokyo').format('HH:mm'),
                        startTime: moment(endDate).add(-Number(repeatEveryMinutes), 'minutes').tz('Asia/Tokyo').format('HH:mm'),
                        endTime: moment(endDate).tz('Asia/Tokyo').format('HH:mm'),
                        endDayRelative: 0,
                        ticketTypeGroup: ticketTypeGroup,
                        mvtkExcludeFlg: 0
                    });


                }
                // console.log('adding timeTable...', o);
                // tempData.push(o);
            }
        });
    }

    // タイムテーブルなしはNG
    if (tempData.length === 0) {
        return {
            ticketData: [],
            timeData: [],
            mvtkExcludeFlgData: []
        };
    }

    if (staicTimeTablePanel && tempData.length !== timeTableData.length) {
        alert('情報が足りないタイムテーブルがあります\nスケジュール登録モーダルを再度開いてください');

        return {
            ticketData: [],
            timeData: [],
            mvtkExcludeFlgData: []
        };
    }

    var timeData = tempData.map(function (data) {
        return {
            doorTime: data.doorTime.replace(':', ''),
            startTime: data.startTime.replace(':', ''),
            endTime: data.endTime.replace(':', ''),
            endDayRelative: Number(data.endDayRelative)
        }
    });
    var ticketData = tempData.map(function (data) {
        return data.ticketTypeGroup
    });
    var mvtkExcludeFlgData = tempData.map(function (data) {
        return data.mvtkExcludeFlg
    });

    return {
        ticketData: ticketData,
        timeData: timeData,
        mvtkExcludeFlgData: mvtkExcludeFlgData
    };
}

/**
 * スケジュール登録実行
 */
function regist() {
    // 作成中なら何もしない
    if (creatingSchedules) {
        return;
    }
    creatingSchedules = true;

    var theater = newModal.find('select[name=theater]').val();
    var screen = newModal.find('select[name=screen]').val();
    var maximumAttendeeCapacity = newModal.find('input[name=maximumAttendeeCapacity]').val();
    var startDate = newModal.find('input[name=screeningDateStart]').val();
    var toDate = newModal.find('input[name=screeningDateThrough]').val();
    var screeningEventId = newModal.find('select[name=superEvent]').val();
    // var seller = newModal.find('select[name=seller]').val();

    // 販売開始日時
    var saleStartDateType = newModal.find('input[name=saleStartDateType]:checked').val();
    var saleStartDate = (saleStartDateType === 'absolute')
        ? newModal.find('input[name=offerValidFromAbsolute]').val()
        : (saleStartDateType === 'relative')
            ? newModal.find('input[name=offerValidFromRelative]').val()
            : 'default';
    var saleStartTime = (saleStartDateType === 'absolute')
        ? newModal.find('input[name=saleStartTime]').val().replace(':', '')
        : 'default';

    // 販売終了日時
    var saleEndDateType = newModal.find('input[name=saleEndDateType]:checked').val();
    var saleEndDate = (saleEndDateType === 'absolute')
        ? newModal.find('input[name=offerValidThroughAbsolute]').val()
        : (saleEndDateType === 'relative')
            ? newModal.find('input[name=offerValidThroughRelative]').val()
            : 'default';
    var saleEndTime = (saleEndDateType === 'absolute')
        ? newModal.find('input[name=saleEndTime]').val().replace(':', '')
        : 'default';

    var onlineDisplayType = newModal.find('input[name=onlineDisplayType]:checked').val();
    var onlineDisplayStartDate = (onlineDisplayType === 'absolute')
        ? newModal.find('input[name=onlineDisplayStartDateAbsolute]').val()
        : newModal.find('input[name=onlineDisplayStartDateRelative]').val();
    var onlineDisplayStartTime = (onlineDisplayType === 'absolute')
        ? newModal.find('input[name=onlineDisplayStartTime]').val().replace(':', '')
        : 'default';

    var tableData = getTableData();
    console.log('tableData:', tableData);

    var weekDayData = getWeekDayData();
    var reservedSeatsAvailable = newModal.find('input[name=reservedSeatsAvailable]:checked').val();

    // if (typeof seller !== 'string' || seller.length === 0) {
    //     creatingSchedules = false;
    //     alert('販売者を選択してください');
    //     return;
    // }

    if (typeof theater !== 'string' || theater.length === 0
        || typeof screen !== 'string' || screen.length === 0
        || typeof startDate !== 'string' || startDate.length === 0
        || typeof toDate !== 'string' || toDate.length === 0
        || typeof screeningEventId !== 'string' || screeningEventId.length === 0
        || typeof saleStartDate !== 'string' || saleStartDate.length === 0
        || typeof saleStartTime !== 'string' || saleStartTime.length === 0
        || typeof saleEndDate !== 'string' || saleEndDate.length === 0
        || typeof saleEndTime !== 'string' || saleEndTime.length === 0
        || typeof onlineDisplayStartDate !== 'string' || onlineDisplayStartDate.length === 0
        || typeof onlineDisplayStartTime !== 'string' || onlineDisplayStartTime.length === 0
    ) {
        creatingSchedules = false;
        alert('未入力の項目があります');
        return;
    }

    if (weekDayData.length === 0) {
        creatingSchedules = false;
        alert('曜日を入力してください');
        return;
    }

    if (tableData.ticketData.length === 0
        || tableData.timeData.length === 0) {
        creatingSchedules = false;
        alert('時刻、興行を入力してください');
        return;
    }

    // 時刻の現実性チェック
    var isTimesValid = true;
    tableData.timeData.forEach(function (data) {
        if (data.doorTime > data.startTime || (data.endDayRelative === 0 && data.startTime > data.endTime)) {
            isTimesValid = false;
        }
    });
    if (!isTimesValid) {
        creatingSchedules = false;
        alert('開場/開始/終了時刻を確認してください');
        return;
    }

    var selectedTheater = newModal.find('select[name=theater] option:selected');
    var maxSeatNumber = selectedTheater.attr('data-max-seat-number');
    var saleStartDays = selectedTheater.attr('data-sale-start-days');
    var endSaleTimeAfterScreening = selectedTheater.attr('data-end-sale-time');

    if (moment(startDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ') >= moment(toDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'day')) {
        creatingSchedules = false;
        alert('登録期間を正しく設定してください');
        return;
    }

    // 登録期間が興行期間に含まれているかどうか確認
    var eventSeriesStartDate = newModal.find('select[name=superEvent]').find('option:selected').attr('data-startDate');
    var eventSeriesEndDate = newModal.find('select[name=superEvent]').find('option:selected').attr('data-endDate');
    if (moment(startDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ') < moment(eventSeriesStartDate)
        || moment(toDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'day') > moment(eventSeriesEndDate)) {
        creatingSchedules = false;
        alert('登録期間を興行期間内に設定してください');
        return;
    }

    if (
        maxSeatNumber === undefined
        || saleStartDays === undefined
        || endSaleTimeAfterScreening === undefined
    ) {
        creatingSchedules = false;
        alert('エラーが発生しました/nページをレフレッシュしてください！');
        return;
    }

    var csrfToken = newModal.find('input[name=csrfToken]').val();

    var originalButtonText = $('.regist-button').text();
    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/events/screeningEvent/new',
        type: 'POST',
        data: {
            csrfToken: csrfToken,
            theater: theater,
            screen: screen,
            maximumAttendeeCapacity: maximumAttendeeCapacity,
            screeningEventId: screeningEventId,
            startDate: startDate,
            toDate: toDate,
            weekDayData: weekDayData,
            timeData: tableData.timeData,
            // 興行選択に向けて名称変更(2022-08-30~)
            // ticketData: tableData.ticketData,
            eventServiceIds: tableData.ticketData,
            mvtkExcludeFlgData: tableData.mvtkExcludeFlgData,
            // seller: seller,
            saleStartDateType: saleStartDateType,
            saleStartDate: saleStartDate,
            saleStartTime: saleStartTime,
            saleEndDateType: saleEndDateType,
            saleEndDate: saleEndDate,
            saleEndTime: saleEndTime,
            onlineDisplayType: onlineDisplayType,
            onlineDisplayStartDate: onlineDisplayStartDate,
            onlineDisplayStartTime: onlineDisplayStartTime,
            maxSeatNumber: maxSeatNumber,
            saleStartDays: saleStartDays,
            endSaleTimeAfterScreening: endSaleTimeAfterScreening,
            reservedSeatsAvailable: reservedSeatsAvailable
        },
        beforeSend: function () {
            $('.regist-button').prop('disabled', true);
            $('.regist-button').text('登録中...');
        }
    }).done(function (data) {
        console.log('events successfully created. response:', data);
        newModal.modal('hide');
        if ($('.search select[name=theater]').val() !== theater) {
            $('.search select[name=theater]').val(theater);
            initializeLocationSelection();
        }
        searchSchedule();

        return;
    }).fail(function (jqxhr, textStatus, error) {
        var message = '';
        console.error(jqxhr, textStatus, error);
        if (jqxhr.responseJSON != undefined && jqxhr.responseJSON != null) {
            message = jqxhr.responseJSON.message;
        }

        alert('登録できませんでした: ' + message + '\nスケジュール登録モーダルを再度開いてください');
    }).always(function () {
        creatingSchedules = false;
        $('.regist-button').prop('disabled', false);
        $('.regist-button').text(originalButtonText);
    });
}

/**
 * スケジュール編集実行
 */
function update() {
    var theater = editModal.find('input[name=theater]').val();
    var screen = editModal.find('input[name=screen]').val();
    var day = editModal.find('input[name=day]').val();
    var endDay = editModal.find('input[name=endDay]').val();
    var screeningEventId = editModal.find('input[name=screeningEventId]').val();
    var performance = editModal.find('input[name=performance]').val();
    var maximumAttendeeCapacity = editModal.find('input[name=maximumAttendeeCapacity]').val();
    var doorTime = editModal.find('input[name=doorTime]').val().replace(':', '');
    var startTime = editModal.find('input[name=startTime]').val().replace(':', '');
    var endTime = editModal.find('input[name=endTime]').val().replace(':', '');
    // プロダクト検索に変更(2022-11-05~)
    var ticketTypeGroup = editModal.find('select[name="itemOfferedProductId"]').val();
    // var seller = editModal.find('select[name=seller]').val();
    var saleStartDate = editModal.find('input[name=saleStartDate]').val();
    var saleStartTime = editModal.find('input[name=saleStartTime]').val().replace(':', '');
    var saleEndDate = editModal.find('input[name=saleEndDate]').val();
    var saleEndTime = editModal.find('input[name=saleEndTime]').val().replace(':', '');
    var onlineDisplayStartDate = editModal.find('input[name=onlineDisplayStartDate]').val();
    var onlineDisplayStartTime = editModal.find('input[name=onlineDisplayStartTime]').val().replace(':', '');
    var maxSeatNumber = editModal.find('input[name=maxSeatNumber]').val();
    var mvtkExcludeFlg = editModal.find('input[name=mvtkExcludeFlg]:checked').val();
    var reservedSeatsAvailable = editModal.find('input[name=reservedSeatsAvailable]').val();

    // 追加特性を収集
    var additionalProperty = [];
    for (let i = 0; i < 10; i++) {
        var additionalPropertyName = editModal.find('select[name="additionalProperty[' + i + '][name]"]').val();
        var additionalPropertyValue = editModal.find('input[name="additionalProperty[' + i + '][value]"]').val();
        additionalProperty.push({ name: String(additionalPropertyName), value: String(additionalPropertyValue) });
    }

    // 販売アプリ設定
    var makesOffer = [];
    var sellerMakesOfferRows = editModal.find('.sellerMakesOfferRow');
    sellerMakesOfferRows.each(function (index) {
        var isCheckedOnApplication = $(this).find('input[name="makesOffer[' + index + '][availableAtOrFrom][][id]"]').prop('checked');
        if (isCheckedOnApplication) {
            var applicationId = $(this).find('input[name="makesOffer[' + index + '][availableAtOrFrom][][id]"]').val();
            makesOffer.push({
                availableAtOrFrom: { id: applicationId },
                validFromDate: $(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').val(),
                validFromTime: $(this).find('input[name="makesOffer[' + index + '][validFromTime]"]').val(),
                validThroughDate: $(this).find('input[name="makesOffer[' + index + '][validThroughDate]"]').val(),
                validThroughTime: $(this).find('input[name="makesOffer[' + index + '][validThroughTime]"]').val(),
                availabilityStartsDate: $(this).find('input[name="makesOffer[' + index + '][availabilityStartsDate]"]').val(),
                availabilityStartsTime: $(this).find('input[name="makesOffer[' + index + '][availabilityStartsTime]"]').val()
            });
        }
    });

    if (performance === ''
        || screen === ''
        || doorTime === ''
        || startTime === ''
        || endTime === ''
        || endDay === ''
        || typeof ticketTypeGroup !== 'string' || ticketTypeGroup === ''
        || saleStartDate === ''
        || saleStartTime === ''
        || saleEndDate === ''
        || saleEndTime === ''
        || onlineDisplayStartDate === ''
        || onlineDisplayStartTime === ''
    ) {
        alert('情報が足りません');
        return;
    }

    // オンライン表示開始日 ≦ 当日を確認
    var performanceBefore = scheduler.editingPerforamce;
    console.log('checking online display start date...', performanceBefore.offers.availabilityStarts);
    var onlineDisplayStartDateBefore = moment(performanceBefore.offers.availabilityStarts);
    var onlineDisplayStartDateAfter = moment(onlineDisplayStartDate + 'T' + onlineDisplayStartTime + ':00+09:00', 'YYYY/MM/DDTHHmm:ssZ');
    var now = moment();
    var confirmed = false;
    if (onlineDisplayStartDateBefore <= now && onlineDisplayStartDateAfter > now) {
        if (window.confirm('オンライン表示中のスケジュールが非表示になります。本当に変更しますか？')) {
            confirmed = true;
        }
    } else {
        confirmed = true;
    }

    if (confirmed) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + performance + '/update',
            type: 'POST',
            data: {
                theater: theater,
                screen: screen,
                maximumAttendeeCapacity: maximumAttendeeCapacity,
                day: day,
                endDay: endDay,
                screeningEventId: screeningEventId,
                doorTime: doorTime,
                startTime: startTime,
                endTime: endTime,
                // 興行選択に向けて名称変更(2022-08-30~)
                eventServiceId: ticketTypeGroup,
                // seller: seller,
                saleStartDate: saleStartDate,
                saleStartTime: saleStartTime,
                saleEndDate: saleEndDate,
                saleEndTime: saleEndTime,
                onlineDisplayStartDate: onlineDisplayStartDate,
                onlineDisplayStartTime: onlineDisplayStartTime,
                maxSeatNumber: maxSeatNumber,
                mvtkExcludeFlg: mvtkExcludeFlg,
                reservedSeatsAvailable: reservedSeatsAvailable,
                additionalProperty: additionalProperty,
                makesOffer: makesOffer
            }
        }).done(function (data) {
            editModal.modal('hide');
            searchSchedule();
            return;
        }).fail(function (jqxhr, textStatus, error) {
            var error = jqxhr.responseJSON;
            var message = '';
            if (error !== undefined && error !== null) {
                message = error.message;
            }
            console.error(jqxhr.responseJSON);
            alert('更新できませんでした:' + message);
        });
    }
}

/**
 * 検索
 */
function searchSchedule() {
    var format = $('.search select[name=format]').val();

    switch (format) {
        case 'table':
            $('#scheduler').addClass('d-none');

            search(1);

            break;

        default:
            $('#list').hide();
            $('#datatables_info,#datatables_paginate,#pager').empty();
            $('#scheduler').removeClass('d-none');

            scheduler.create();
            break;
    }
}

//--------------------------------
// 検索API呼び出し
//--------------------------------
function search(pageNumber) {
    // 検索条件取得
    conditions = $.fn.getDataFromForm('.search form');
    conditions['limit'] = ITEMS_ON_PAGE;
    conditions['page'] = pageNumber;

    $.ajax({
        dataType: 'json',
        url: SEARCH_URL,
        cache: false,
        type: 'GET',
        data: conditions,
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        if (data.success) {
            var dataCount = (data.count) ? (data.count) : 0;
            // 一覧表示
            if ($.CommonMasterList.bind(data.results, dataCount, pageNumber)) {
                $('#list').show();
            } else {
                $('#list').hide();
            }
        }
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

/**
 * イベント中止
 */
function deletePerformance() {
    var cancellingEventId = editModal.find('input[name=performance]')
        .val();
    if (typeof cancellingEventId !== 'string' || cancellingEventId.length === 0) {
        alert('イベントIDが未指定です');

        return;
    }

    var confirmed = false;
    if (window.confirm('本当にキャンセルしますか？')) {
        confirmed = true;
    }

    if (confirmed) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + cancellingEventId + '/cancel',
            type: 'PUT',
        }).done(function (data) {
            editModal.modal('hide');
            searchSchedule();
        }).fail(function (jqxhr, textStatus, error) {
            console.error(jqxhr, textStatus, error);
            alert('中止できませんでした');
        });
    }
}

/**
 * モーダル初期化
 */
function modalInit(theater, date) {
    // no op
}

function createNewEvent() {
    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/events/screeningEvent/new',
        type: 'GET',
    })
        .done(function (data) {
            openNewModal(data.token);
        })
        .fail(function (jqxhr, textStatus, error) {
            var message = '';
            if (jqxhr.responseJSON != undefined && jqxhr.responseJSON != null) {
                message = jqxhr.responseJSON.message;
            }

            alert('スケジュール登録モーダルを再度開いてください: ' + message);
        });
}

/**
 * スケジュール登録モーダルオープン
 */
function openNewModal(token) {
    newModal.find('input[name=csrfToken]').val(token);
    newModal.find('select[name=theater]')
        .val(null)
        .trigger('change');
    newModal.find('input[name=weekDay]').prop('checked', true);
    newModal.find('select[name=superEvent]')
        .html('<option selected disabled>施設を選択してください</option>');
    // try {
    //     modal.find('#superEvent').select2('destory');
    // } catch (error) {
    // }
    newModal.find('select[name=screen]')
        .html('<option selected disabled>施設を選択してください</option>');
    // newModal.find('select[name=seller]')
    //     .html('<option selected disabled>施設を選択してください</option>');

    newModal.find('input[name=maximumAttendeeCapacity]').val('');
    newModal.find('input[name=doorTime]').val('');
    newModal.find('input[name=startTime]').val('');
    newModal.find('input[name=endTime]').val('');
    newModal.find('select[name=endDayRelative]').select2('val', '0');
    // newModal.find('input[name=mvtkExcludeFlg]').removeAttr('checked');
    newModal.find('input[name=mvtkExcludeFlg]').prop('checked', false);
    newModal.find('select[name="itemOffered"]')
        .val(null)
        .trigger('change');
    newModal.find('select[name="itemOfferedProductId"]')
        .val(null)
        .trigger('change');
    newModal.find('input[name=offerValidFromAbsolute]').datepicker('update', '');
    newModal.find('input[name=saleStartTime]').val('');
    newModal.find('input[name=onlineDisplayStartDateRelative]').val('');
    newModal.find('input[name=onlineDisplayStartDateAbsolute]').datepicker('update', '');
    newModal.find('input[name=onlineDisplayStartDate]').datepicker('update', '');
    newModal.find('input[name=onlineDisplayStartTime]').val('00:00');
    newModal.find('input[name=maxSeatNumber]').val('');

    newModal.find('input[name=screeningDateStart]').datepicker('update', new Date());
    newModal.find('input[name=screeningDateThrough]').datepicker('update', new Date());

    newModal.find('.mvtk').show();

    newModal.find('.timeTable').attr('data-dirty', false);

    newModal.modal();
};

/**
 * スケジューラー生成
 */
function createScheduler() {
    return new Vue({
        el: '#scheduler',
        data: {
            editingPerforamce: undefined,
            HOUR_HEIGHT: 40,
            SCREEN_WIDTH: 60,
            TIME_WIDTH: 50,
            moment: moment,
            searchCondition: {},
            scheduleData: {
                dates: []
            },
            times: []
        },
        methods: {
            /**
             * 座席指定判定
             */
            isReservedSeatsAvailable: function (performance) {
                return performance.offers !== undefined
                    && performance.offers.itemOffered !== undefined
                    && performance.offers.itemOffered.serviceOutput !== undefined
                    && performance.offers.itemOffered.serviceOutput.reservedTicket !== undefined
                    && performance.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat !== undefined;
            },
            /**
             * ムビチケ対応判定
             */
            isSupportMovieTicket: function (performance) {
                // unacceptedPaymentMethodにMovieTicketは含まれていればムビチケ利用不可
                var unaccepted = performance.offers !== undefined
                    && Array.isArray(performance.offers.unacceptedPaymentMethod)
                    && performance.offers.unacceptedPaymentMethod.indexOf('MovieTicket') >= 0;

                return unaccepted;
            },
            /**
             * 追加特性取得performance.superEvent.additionalProperty
             */
            getAdditionalProperty: function (additionalPropertys, name) {
                if (additionalPropertys === undefined) {
                    return null;
                }
                var findResult = additionalPropertys.find(function (additionalProperty) {
                    return (additionalProperty.name === name);
                });
                if (findResult === undefined) {
                    return null;
                }
                return findResult.value;
            },
            /**
             * スケジューラー生成
             */
            create: function () {
                this.createTimes();
                this.searchCondition = this.getSearchCondition();
                console.log('this.searchCondition:', this.searchCondition);
                if (this.searchCondition.theater === ''
                    || this.searchCondition.date === '') {
                    alert('施設、開催日を選択してください');
                    return;
                }
                var _this = this;

                this.searchScreeningEvent()
                    .then(function (data) {
                        modalInit(_this.getSearchCondition().theater, _this.getSearchCondition().date);
                        _this.createScheduleData(data);
                    })
                    .catch(function (error) {
                        alert('検索できませんでした');
                    });
            },
            /**
             * 検索条件取得
             */
            getSearchCondition: function () {
                return {
                    theater: $('.search select[name=theater]').val(),
                    date: $('.search input[name=date]').val(),
                    format: $('.search select[name=format]').val(),
                    screen: ($('.search select[name=screen]').val() === '') ? undefined : $('.search select[name=screen]').val(),
                    onlyReservedSeatsAvailable: $('.search input[name=onlyReservedSeatsAvailable]:checked').val(),
                    offersAvailable: $('.search input[name="offersAvailable"]:checked').val(),
                    offersValid: $('.search input[name="offersValid"]:checked').val(),
                    onlyEventScheduled: $('.search input[name="onlyEventScheduled"]:checked').val(),
                    'superEvent[workPerformed][identifier]': $('.search select[name="superEvent\\[workPerformed\\]\\[identifier\\]"]').val(),
                    'id[$eq]': $('.search input[name="id\\[$eq\\]"]').val(),
                    'itemOffered[id]': $('.search select[name="itemOffered\\[id\\]"]').val()
                };
            },
            /**
             * スケジュール情報検索API
             */
            searchScreeningEvent: function () {
                var options = {
                    dataType: 'json',
                    url: SEARCH_URL,
                    type: 'GET',
                    data: this.searchCondition,
                    beforeSend: function () {
                        $('#loadingModal').modal({ backdrop: 'static' });
                    }
                };
                return $.ajax(options)
                    .always(function () {
                        $('#loadingModal').modal('hide');
                    });
            },
            /**
             * スケジュールデータ作成
             */
            createScheduleData: function (data) {
                this.scheduleData.dates = [];
                for (var i = 0; i < Number(this.searchCondition.format); i++) {
                    var date = moment(this.searchCondition.date, 'YYYY/MM/DD')
                        .add(i, 'days')
                        .toISOString();
                    this.scheduleData.dates.push({
                        data: date,
                        screens: data.screens.map(function (s) {
                            return {
                                data: s,
                                performances: data.performances.filter(function (p) {
                                    var expectedDate = moment(date)
                                        .tz('Asia/Tokyo')
                                        .format('YYYYMMDD');
                                    var isDateMatched = moment(p.startDate).tz('Asia/Tokyo').format('YYYYMMDD') === expectedDate
                                        || moment(p.endDate).tz('Asia/Tokyo').format('YYYYMMDD') === expectedDate;
                                    var isLocationMatched = p.location.branchCode === s.branchCode;

                                    // 同一ルームかつ同一日時に上映しているか
                                    return isLocationMatched && isDateMatched;
                                })
                            };
                        })
                    });
                }
            },
            /**
             * 時間データ生成
             */
            createTimes: function () {
                this.times = [];
                for (var i = 0; i < 24; i++) {
                    this.times.push(`0${i}`.slice(-2) + ':00');
                }
            },
            /**
             * パフォーマンスの表示位置取得
             */
            getPerformanceStyle: function (performance, date) {
                var viewDate = {
                    day: moment(date.data).tz('Asia/Tokyo').format('YYYYMMDD'),
                    hour: moment(date.data).tz('Asia/Tokyo').format('HH'),
                    minutes: moment(date.data).tz('Asia/Tokyo').format('mm')
                }
                var start = {
                    day: moment(performance.doorTime).tz('Asia/Tokyo').format('YYYYMMDD'),
                    hour: moment(performance.doorTime).tz('Asia/Tokyo').format('HH'),
                    minutes: moment(performance.doorTime).tz('Asia/Tokyo').format('mm')
                };
                var end = {
                    day: moment(performance.endDate).tz('Asia/Tokyo').format('YYYYMMDD'),
                    hour: moment(performance.endDate).tz('Asia/Tokyo').format('HH'),
                    minutes: moment(performance.endDate).tz('Asia/Tokyo').format('mm')
                };

                var hour = 60;
                var top = (start.hour * this.HOUR_HEIGHT) + (start.minutes * this.HOUR_HEIGHT / hour);
                var left = 0;
                var borderRadius = '6px';

                var height = ((end.hour - start.hour) * this.HOUR_HEIGHT) + ((end.minutes - start.minutes) * this.HOUR_HEIGHT / hour);
                // 日本時間で日またぎの場合（当日表示）
                if (Number(end.day) > Number(start.day) && Number(start.day) === Number(viewDate.day)) {
                    height = ((24 - start.hour) * this.HOUR_HEIGHT) + ((0 - start.minutes) * this.HOUR_HEIGHT / hour);
                    borderRadius = '6px 6px 0px 0px';
                }
                // 日本時間で日またぎの場合（翌日表示）
                if (Number(end.day) > Number(start.day) && Number(end.day) === Number(viewDate.day)) {
                    top = 0;
                    height = ((end.hour - 0) * this.HOUR_HEIGHT) + ((end.minutes - 0) * this.HOUR_HEIGHT / hour);
                    borderRadius = '0px 0px 6px 6px';
                }

                var opacity = 1;
                if (performance.eventStatus === 'EventCancelled') {
                    opacity = 0.5;
                }

                return {
                    parent: {
                        top: top + 'px',
                        left: left + 'px',
                        height: height + 'px',
                        '-moz-opacity': opacity,
                        opacity: opacity
                    },
                    child: {
                        backgroundColor: this.getAdditionalProperty(performance.superEvent.additionalProperty, 'color'),
                        borderRadius: borderRadius
                    }
                };
            },
            /**
             * 時間重複数取得
             */
            getOverlapPerformanceCount: function (targetPerformance, performances) {
                var doorTime = moment(targetPerformance.doorTime).unix();
                var endDate = moment(targetPerformance.endDate).unix();
                var filterResult = performances.filter(function (p) {
                    return ((moment(p.doorTime).unix() < doorTime && moment(p.endDate).unix() > doorTime)
                        || (moment(p.doorTime).unix() < endDate && moment(p.endDate).unix() > endDate));
                });
                return filterResult.length;
            },

            /**
             * イベントのカタログを取得する
             */
            findCatalogByPerformance: function (performance) {
                var options = {
                    dataType: 'json',
                    url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + performance.id + '/hasOfferCatalog',
                    type: 'GET',
                    data: {},
                    beforeSend: function () {
                        $('#loadingModal').modal({ backdrop: 'static' });
                    }
                };

                return $.ajax(options)
                    .always(function () {
                        $('#loadingModal').modal('hide');
                    });
            },

            /**
             * イベントの興行を取得する
             */
            findItemOfferedByPerformance: function (performance) {
                var options = {
                    dataType: 'json',
                    url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + performance.id + '/itemOffered',
                    type: 'GET',
                    data: {},
                    beforeSend: function () {
                        $('#loadingModal').modal({ backdrop: 'static' });
                    }
                };

                return $.ajax(options)
                    .always(function () {
                        $('#loadingModal').modal('hide');
                    });
            },

            /**
             * イベントの販売者を取得する
             */
            // findSellerByPerformance: function (performance) {
            //     var options = {
            //         dataType: 'json',
            //         url: '/projects/' + PROJECT_ID + '/sellers/' + performance.offers.seller.id,
            //         type: 'GET',
            //         data: {},
            //         beforeSend: function () {
            //             $('#loadingModal').modal({ backdrop: 'static' });
            //         }
            //     };

            //     return $.ajax(options)
            //         .always(function () {
            //             $('#loadingModal').modal('hide');
            //         });
            // },

            /**
             * パフォーマンス表示
             */
            showPerformance: function (performance) {
                var _this = this;

                var modal = $('#showModal');

                modal.find('a.edit')
                    .off('click')
                    .on('click', function () {
                        _this.findItemOfferedByPerformance(performance)
                            .then(function (product) {
                                console.log('EventServivce product found.', product);
                                _this.editPerformance(performance, product);
                                // 販売者取得はもはや不要(2022-12-12~)
                                // _this.findSellerByPerformance(performance)
                                //     .then(function (seller) {
                                //         console.log('seller found.', seller);

                                //         _this.editPerformance(performance, product, seller);
                                //     })
                                //     .catch(function (error) {
                                //         alert('販売者を検索できませんでした');
                                //     });
                            })
                            .catch(function (error) {
                                alert('興行を検索できませんでした');
                            });
                    });

                modal.find('a.reserve')
                    .off('click')
                    .on('click', function () {
                        var url = '/projects/' + PROJECT_ID + '/assetTransactions/reserve/start?event=' + performance.id;
                        window.open(url, '_blank');
                    });

                modal.find('a.aggregateReservation')
                    .off('click')
                    .on('click', function () {
                        _this.aggregateReservation(performance);
                    });

                modal.find('a.postponeEvent')
                    .off('click')
                    .on('click', function () {
                        _this.postponeEvent(performance);
                    });

                modal.find('a.rescheduleEvent')
                    .off('click')
                    .on('click', function () {
                        _this.rescheduleEvent(performance);
                    });

                if (performance.eventStatus === 'EventScheduled') {
                    modal.find('a.postponeEvent')
                        .show();
                    modal.find('a.rescheduleEvent')
                        .hide();
                } else if (performance.eventStatus === 'EventPostponed') {
                    modal.find('a.postponeEvent')
                        .hide();
                    modal.find('a.rescheduleEvent')
                        .show();
                } else {
                    modal.find('a.postponeEvent')
                        .hide();
                    modal.find('a.rescheduleEvent')
                        .hide();
                }

                var seller = {};
                if (performance.offers.seller !== undefined) {
                    seller = performance.offers.seller;
                }
                if (seller.name === undefined) {
                    seller.name = {};
                }

                var seatsAvailable = (this.isReservedSeatsAvailable(performance)) ? '有' : '無';
                var remainingAttendeeCapacity = '';
                var maximumAttendeeCapacity = '';
                if (typeof performance.remainingAttendeeCapacity === 'number') {
                    remainingAttendeeCapacity = String(performance.remainingAttendeeCapacity);
                }
                if (typeof performance.maximumAttendeeCapacity === 'number') {
                    maximumAttendeeCapacity = String(performance.maximumAttendeeCapacity);
                }

                var details = $('<dl>').addClass('row')
                    .append($('<dt>').addClass('col-md-3').append('ID'))
                    .append($('<dd>').addClass('col-md-9').append(performance.id))
                    .append($('<dt>').addClass('col-md-3').append('ステータス'))
                    .append($('<dd>').addClass('col-md-9').append(performance.eventStatus))
                    .append($('<dt>').addClass('col-md-3').append('名称'))
                    .append($('<dd>').addClass('col-md-9').append(performance.name.ja))
                    .append($('<dt>').addClass('col-md-3').append('開始日時'))
                    .append($('<dd>').addClass('col-md-9').append(
                        moment(performance.startDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')
                    ))
                    .append($('<dt>').addClass('col-md-3').append('終了日時'))
                    .append($('<dd>').addClass('col-md-9').append(
                        moment(performance.endDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')
                    ))
                    .append($('<dt>').addClass('col-md-3').append('施設'))
                    .append($('<dd>').addClass('col-md-9').append(performance.superEvent.location.name.ja + ' ' + performance.location.name.ja))
                    .append($('<dt>').addClass('col-md-3').append('キャパシティ'))
                    .append($('<dd>').addClass('col-md-9').append(remainingAttendeeCapacity + ' / ' + maximumAttendeeCapacity));

                details
                    // .append($('<dt>').addClass('col-md-3').append('販売者'))
                    // .append($('<dd>').addClass('col-md-9').append(
                    //     $('<a>').attr({
                    //         target: '_blank',
                    //         'href': '/projects/' + PROJECT_ID + '/sellers/' + seller.id + '/update'
                    //     }).html('表示 <i class="material-icons" style="font-size: 1.2em;">open_in_new</i>')
                    // ))
                    .append($('<dt>').addClass('col-md-3').append('座席'))
                    .append($('<dd>').addClass('col-md-9').append(seatsAvailable))
                    // .append($('<dt>').addClass('col-md-3').append('オンライン表示期間'))
                    // .append($('<dd>').addClass('col-md-9').append(
                    //     moment(performance.offers.availabilityStarts).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mmZ')
                    //     + ' - '
                    //     + moment(performance.offers.availabilityEnds).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mmZ')
                    // ))
                    // .append($('<dt>').addClass('col-md-3').append('オンライン販売期間'))
                    // .append($('<dd>').addClass('col-md-9').append(
                    //     moment(performance.offers.validFrom).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mmZ')
                    //     + ' - '
                    //     + moment(performance.offers.validThrough).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mmZ')
                    // ))
                    ;

                var div = $('<div>')
                    .append(details);

                // modal.find('.modal-title').text('イベントオファー');
                modal.find('.modal-body').html(div);

                modal.modal();
            },

            /**
             * パフォーマンス編集
             */
            // editPerformance: function (performance, offerCatalog, seller) {
            // editPerformance: function (performance, product, seller) {
            editPerformance: function (performance, product) {
                this.editingPerforamce = performance;
                console.log('editing event... event:', this.editingPerforamce);
                console.log('editing event... product:', product);

                // var fix = function (time) { return ('0' + (parseInt(time / 5) * 5)).slice(-2); };
                var day = moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD');

                editModal.find('.day span').text(moment(day).format('YYYY/MM/DD'));
                editModal.find('.day input').val(moment(day).format('YYYY/MM/DD'));

                // nav tablistデフォルト表示に調整
                editModal.find('.nav .nav-item .nav-link')
                    .first()
                    .tab('show');

                // チェックstartTime削除ボタン表示
                if (moment(day).isSameOrAfter(moment().tz('Asia/Tokyo'), 'day')) {
                    editModal.find('.delete-button').show();
                } else {
                    editModal.find('.delete-button').hide();
                }

                // ボタン有効性
                editModal.find('.update-button').prop('disabled', false);
                editModal.find('.delete-button').prop('disabled', false);
                if (performance.eventStatus === 'EventCancelled') {
                    editModal.find('.update-button').prop('disabled', true);
                    editModal.find('.delete-button').prop('disabled', true);
                }

                editModal.find('input[name=performance]').val(performance.id);
                editModal.find('input[name=theater]').val(performance.superEvent.location.id);
                editModal.find('input[name=screen]').val(performance.location.branchCode);
                editModal.find('input[name=day]').val(day);
                editModal.find('input[name=screeningEventId]').val(performance.superEvent.id);
                editModal.find('input[name=mvtkExcludeFlg]').prop('checked', this.isSupportMovieTicket(performance));
                editModal.find('input[name=reservedSeatsAvailableDisabled]').prop('checked', this.isReservedSeatsAvailable(performance));
                editModal.find('input[name=reservedSeatsAvailable]').val((this.isReservedSeatsAvailable(performance)) ? '1' : '0');

                if (performance.offers !== undefined && performance.offers.eligibleQuantity !== undefined) {
                    editModal.find('input[name=maxSeatNumber]').val((performance.offers !== undefined) ? performance.offers.eligibleQuantity.maxValue : '');
                }

                editModal.find('input[name=maximumAttendeeCapacity]').val(performance.location.maximumAttendeeCapacity);
                editModal.find('.film span').text(performance.superEvent.name.ja);
                editModal.find('.film input').val(performance.superEvent.name.ja);
                editModal.find('.theater input').val(performance.superEvent.location.name.ja);
                editModal.find('.screen input').val(performance.location.name.ja);

                // 上映時間
                var doorTime = moment(performance.doorTime).tz('Asia/Tokyo').format('HH:mm');
                var startTime = moment(performance.startDate).tz('Asia/Tokyo').format('HH:mm');
                var endDay = moment(performance.endDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
                var endTime = moment(performance.endDate).tz('Asia/Tokyo').format('HH:mm');
                editModal.find('input[name=doorTime]').val(doorTime);
                editModal.find('input[name=startTime]').val(startTime);
                editModal.find('input[name=endTime]').val(endTime);
                editModal.find('input[name=endDay]').datepicker('update', endDay);

                // カタログの初期値を設定する
                // 興行IDに変更(2022-11-05~)
                // var itemOfferedNewOption = new Option(offerCatalog.name.ja, offerCatalog.id, true, true);
                // editModal.find('select[name="itemOffered"]')
                //     .append(itemOfferedNewOption)
                //     .trigger('change');
                var itemOfferedNewOption = new Option(product.name.ja, product.id, true, true);
                editModal.find('select[name="itemOfferedProductId"]')
                    .append(itemOfferedNewOption)
                    .trigger('change');

                // if (seller !== undefined && seller !== null) {
                //     // 販売者をセット
                //     var options = ['<option selected="selected" value="' + seller.id + '">' + seller.name.ja + '</option>'];
                //     editModal.find('select[name=seller]').html(options);
                // }

                // 販売開始日時
                var saleStartDate = (performance.offers === undefined)
                    ? '' : moment(performance.offers.validFrom).tz('Asia/Tokyo').format('YYYY/MM/DD');
                var saleStartTime = (performance.offers === undefined)
                    ? '' : moment(performance.offers.validFrom).tz('Asia/Tokyo').format('HH:mm');
                if (saleStartDate !== '' && saleStartTime !== '') {
                    if (editModal.find('input[name=saleStartDate]').hasClass('datepicker')) {
                        editModal.find('input[name=saleStartDate]').datepicker('update', saleStartDate);
                    } else {
                        editModal.find('input[name=saleStartDate]').val(saleStartDate);
                    }
                    editModal.find('input[name=saleStartTime]').val(saleStartTime);
                } else {
                    editModal.find('input[name=saleStartDate]').val('');
                    editModal.find('input[name=saleStartTime]').val('');
                }

                // 販売終了日時
                var saleEndDate = (performance.offers === undefined)
                    ? '' : moment(performance.offers.validThrough).tz('Asia/Tokyo').format('YYYY/MM/DD');
                var saleEndTime = (performance.offers === undefined)
                    ? '' : moment(performance.offers.validThrough).tz('Asia/Tokyo').format('HH:mm');
                if (saleEndDate !== '' && saleEndTime !== '') {
                    if (editModal.find('input[name=saleEndDate]').hasClass('datepicker')) {
                        editModal.find('input[name=saleEndDate]').datepicker('update', saleEndDate);
                    } else {
                        editModal.find('input[name=saleEndDate]').val(saleStartDate);
                    }
                    editModal.find('input[name=saleEndTime]').val(saleEndTime);
                } else {
                    editModal.find('input[name=saleEndDate]').val('');
                    editModal.find('input[name=saleEndTime]').val('');
                }

                // オンライン表示
                var onlineDisplayStartDate = (performance.offers)
                    ? moment(performance.offers.availabilityStarts).tz('Asia/Tokyo').format('YYYY/MM/DD') : '';
                var onlineDisplayStartTime = (performance.offers)
                    ? moment(performance.offers.availabilityStarts).tz('Asia/Tokyo').format('HH:mm') : '';
                if (onlineDisplayStartDate !== '') {
                    if (editModal.find('input[name=onlineDisplayStartDate]').hasClass('datepicker')) {
                        editModal.find('input[name=onlineDisplayStartDate]').datepicker('update', onlineDisplayStartDate);
                    } else {
                        editModal.find('input[name=onlineDisplayStartDate]').val(onlineDisplayStartDate);
                    }
                    editModal.find('input[name=onlineDisplayStartTime]').val(onlineDisplayStartTime);
                } else {
                    editModal.find('input[name=onlineDisplayStartDate]').val('');
                    editModal.find('input[name=onlineDisplayStartTime]').val('');
                }

                // 追加特性(フォームを初期化してからイベントの値をセット)
                for (let i = 0; i < 10; i++) {
                    // editModal.find('input[name="additionalProperty[' + i + '][name]"]').val('');
                    editModal.find('select[name="additionalProperty[' + i + '][name]"]').val(null)
                        .trigger('change');
                    editModal.find('input[name="additionalProperty[' + i + '][value]"]').val('');
                }
                var additionalProperty = (Array.isArray(performance.additionalProperty)) ? performance.additionalProperty : [];
                additionalProperty.forEach(function (property, index) {
                    // editModal.find('input[name="additionalProperty[' + index + '][name]"]').val(property.name);
                    var itemOfferedNewOption = new Option(property.name, property.name, true, true);
                    editModal.find('select[name="additionalProperty[' + index + '][name]"]')
                        .append(itemOfferedNewOption)
                        .trigger('change');
                    editModal.find('input[name="additionalProperty[' + index + '][value]"]').val(property.value);
                });


                // 販売アプリ設定初期化
                var sellerMakesOfferRows = editModal.find('.sellerMakesOfferRow');
                if (performance.offers !== undefined) {
                    sellerMakesOfferRows.each(function (index) {
                        var applicationId = $(this).find('input[name="makesOffer[' + index + '][availableAtOrFrom][][id]"]').val();

                        // forms初期化
                        $(this).find('input[name="makesOffer[' + index + '][availableAtOrFrom][][id]"]').prop('checked', false);
                        $(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').val('');
                        $(this).find('input[name="makesOffer[' + index + '][validFromTime]"]').val('');
                        $(this).find('input[name="makesOffer[' + index + '][validThroughDate]"]').val('');
                        $(this).find('input[name="makesOffer[' + index + '][validThroughTime]"]').val('');
                        $(this).find('input[name="makesOffer[' + index + '][availabilityStartsDate]"]').val('');
                        $(this).find('input[name="makesOffer[' + index + '][availabilityStartsTime]"]').val('');

                        // event.offers.seller.makesOfferの設定を適用する
                        var makesOfferFromEvent = performance.offers.seller.makesOffer;
                        if (Array.isArray(makesOfferFromEvent)) {
                            var offerByApplication = makesOfferFromEvent.find(function (offerFromEvent) {
                                return Array.isArray(offerFromEvent.availableAtOrFrom)
                                    && offerFromEvent.availableAtOrFrom.length > 0
                                    && offerFromEvent.availableAtOrFrom[0].id === applicationId;
                            });
                            if (offerByApplication !== undefined) {
                                // 販売チェックON
                                $(this).find('input[name="makesOffer[' + index + '][availableAtOrFrom][][id]"]').prop('checked', true);

                                // 販売開始日時
                                var validFromDateOnApplication = moment(offerByApplication.validFrom).tz('Asia/Tokyo').format('YYYY/MM/DD');
                                var validFromTimeOnApplication = moment(offerByApplication.validFrom).tz('Asia/Tokyo').format('HH:mm');
                                if (validFromDateOnApplication !== '' && validFromTimeOnApplication !== '') {
                                    if ($(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').hasClass('datepicker')) {
                                        $(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').datepicker('update', validFromDateOnApplication);
                                    } else {
                                        $(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').val(validFromDateOnApplication);
                                    }
                                    $(this).find('input[name="makesOffer[' + index + '][validFromTime]"]').val(validFromTimeOnApplication);
                                }

                                // 販売終了日時
                                var validThroughDateOnApplication = moment(offerByApplication.validThrough).tz('Asia/Tokyo').format('YYYY/MM/DD');
                                var validThroughTimeOnApplication = moment(offerByApplication.validThrough).tz('Asia/Tokyo').format('HH:mm');
                                if (validThroughDateOnApplication !== '' && validThroughTimeOnApplication !== '') {
                                    if ($(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').hasClass('datepicker')) {
                                        $(this).find('input[name="makesOffer[' + index + '][validThroughDate]"]').datepicker('update', validThroughDateOnApplication);
                                    } else {
                                        $(this).find('input[name="makesOffer[' + index + '][validThroughDate]"]').val(validThroughDateOnApplication);
                                    }
                                    $(this).find('input[name="makesOffer[' + index + '][validThroughTime]"]').val(validThroughTimeOnApplication);
                                }

                                // 表示開始日時
                                var availabilityStartsDateOnApplication = moment(offerByApplication.availabilityStarts).tz('Asia/Tokyo').format('YYYY/MM/DD');
                                var availabilityStartsTimeOnApplication = moment(offerByApplication.availabilityStarts).tz('Asia/Tokyo').format('HH:mm');
                                if (availabilityStartsDateOnApplication !== '' && availabilityStartsTimeOnApplication !== '') {
                                    if ($(this).find('input[name="makesOffer[' + index + '][validFromDate]"]').hasClass('datepicker')) {
                                        $(this).find('input[name="makesOffer[' + index + '][availabilityStartsDate]"]').datepicker('update', availabilityStartsDateOnApplication);
                                    } else {
                                        $(this).find('input[name="makesOffer[' + index + '][availabilityStartsDate]"]').val(availabilityStartsDateOnApplication);
                                    }
                                    $(this).find('input[name="makesOffer[' + index + '][availabilityStartsTime]"]').val(availabilityStartsTimeOnApplication);
                                }
                            }
                        }
                    });
                }

                editModal.modal();
            },

            aggregateReservation: function (event) {
                console.log('aggregating...', event.id);

                $.ajax({
                    dataType: 'json',
                    url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + event.id + '/aggregateReservation',
                    type: 'POST',
                }).done(function (data) {
                    alert('集計を開始しました');
                }).fail(function (jqxhr, textStatus, error) {
                    console.error(jqxhr, textStatus, error);
                    alert('集計を開始できませんでした');
                });
            },

            postponeEvent: function (event) {
                console.log('postponing...', event.id);
                var modal = $('#showModal');

                $.ajax({
                    dataType: 'json',
                    url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + event.id + '/postpone',
                    type: 'PUT',
                }).done(function (data) {
                    alert('イベントを保留しました');
                    modal.modal('hide');
                    searchSchedule();
                }).fail(function (jqxhr, textStatus, error) {
                    console.error(jqxhr, textStatus, error);
                    alert('保留できませんでした');
                });
            },

            rescheduleEvent: function (event) {
                console.log('rescheduling...', event.id);
                var modal = $('#showModal');

                $.ajax({
                    dataType: 'json',
                    url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + event.id + '/reschedule',
                    type: 'PUT',
                }).done(function (data) {
                    alert('イベントを再スケジュールしました');
                    modal.modal('hide');
                    searchSchedule();
                }).fail(function (jqxhr, textStatus, error) {
                    console.error(jqxhr, textStatus, error);
                    alert('再スケジュールできませんでした');
                });
            }
        }
    });
}

/**
 * 入力方法切り替え(絶対・相対)
 */
function changeInputType() {
    var inputType = $(this).val();
    var parent = $(this).parents('.form-group');
    parent.find('.input-type').addClass('d-none');
    parent.find('.input-type[data-input-type=' + inputType + ']').removeClass('d-none');
}

async function showOffersById(id) {
    var event = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (event === undefined) {
        alert('イベント' + id + 'が見つかりません');

        return;
    }

    // 101件以上に対応
    var offers = [];
    var limit = 100;
    var page = 0;
    var numData = limit;
    while (limit === numData) {
        page += 1;

        var offersOnPage = await new Promise((resolve, reject) => {
            $.ajax({
                dataType: 'json',
                url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + id + '/offers',
                cache: false,
                type: 'GET',
                data: {
                    limit: limit,
                    page: page
                },
                beforeSend: function () {
                    $('#loadingModal').modal({ backdrop: 'static' });
                }
            })
                .done(function (data) {
                    resolve(data);
                })
                .fail(function (xhr, textStatus, error) {
                    var res = { message: '予期せぬエラー' };
                    try {
                        var res = $.parseJSON(xhr.responseText);
                    } catch (error) {
                        // no op                    
                    }
                    alert('検索できませんでした: ' + res.message);
                    reject(new Error(res.message));
                })
                .always(function (data) {
                    $('#loadingModal').modal('hide');
                });
        });

        numData = offersOnPage.length;
        offers.push(...offersOnPage);
    }

    // 販売アプリケーション名称取得
    var applications = await new Promise((resolve, reject) => {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/applications/search',
            cache: false,
            type: 'GET',
            data: {
                limit: 100,
                page: 1
            },
            beforeSend: function () {
                $('#loadingModal').modal({ backdrop: 'static' });
            }
        })
            .done(function (data) {
                resolve(data.results);
            })
            .fail(function (xhr, textStatus, error) {
                var res = { message: '予期せぬエラー' };
                try {
                    var res = $.parseJSON(xhr.responseText);
                } catch (error) {
                    // no op                    
                }
                alert('アプリケーションを検索できませんでした: ' + res.message);
                reject(new Error(res.message));
            })
            .always(function (data) {
                $('#loadingModal').modal('hide');
            });
    });
    console.log('applications found.', applications);

    showOffers(event, offers, applications);
}

function searchUpdateActionsById(id) {
    var event = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (event === undefined) {
        alert('イベント' + id + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/events/screeningEvent/' + id + '/updateActions',
        cache: false,
        type: 'GET',
        data: {},
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        showUpdateActions(data);
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function showUpdateActions(actions) {
    var modal = $('#modal-event');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('タイプ'),
                $('<th>').text('開始'),
                $('<th>').text('ステータス'),
                $('<th>').text('説明')
            ])
        ]);
    var tbody = $('<tbody>')
        .append(actions.map(function (action) {
            var timeline = action.timeline;

            var description = '<a href="javascript:void(0)">' + timeline.agent.name
                + '</a>が';

            if (timeline.recipient !== undefined) {
                var recipientName = String(timeline.recipient.name);
                if (recipientName.length > 40) {
                    recipientName = String(timeline.recipient.name).slice(0, 40) + '...';
                }
                description += '<a href="javascript:void(0)">'
                    + '<span>' + recipientName + '</span>'
                    + '</a> に';
            }

            if (timeline.purpose !== undefined) {
                description += '<a href="javascript:void(0)">'
                    + '<span>' + timeline.purpose.name + '</span>'
                    + '</a> のために';
            }

            description += '<a href="javascript:void(0)">'
                + '<span>' + timeline.object.name + '</span>'
                + '</a> を'
                + '<span>' + timeline.actionName + '</span>'
                + '<span>' + timeline.actionStatusDescription + '</span>';

            return $('<tr>').append([
                $('<td>').html(
                    $('<span>')
                        .addClass(['badge', 'badge-light'].join(' '))
                        .text(action.typeOf)
                ),
                $('<td>').text(action.startDate),
                $('<td>').html(
                    $('<span>')
                        .addClass(['badge', 'badge-light', action.actionStatus].join(' '))
                        .text(action.actionStatus)
                ),
                $('<td>').html(description)
            ]);
        }))
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);

    var div = $('<div>')
        .append($('<div>').addClass('table-responsive').append(table));

    modal.find('.modal-title').text('アクション');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showOffers(event, offers, applications) {
    var modal = $('#modal-event');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('コード'),
                $('<th>').text('名称')
            ])
        ]);
    var tbody = $('<tbody>')
        .append(offers.map(function (result) {
            var url = '/projects/' + PROJECT_ID + '/offers/' + result.id + '/update';

            return $('<tr>').append([
                $('<td>').html('<a target="_blank" href="' + url + '">' + result.identifier + ' <i class="material-icons" style="font-size: 1.2em;">open_in_new</i></a>'),
                $('<td>').text(result.name.ja)
            ]);
        }))
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);

    var thead4makesOffer = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('名称'),
                $('<th>').text('販売開始'),
                $('<th>').text('販売終了'),
                $('<th>').text('表示開始')
            ])
        ]);
    var tbody4makesOffer = $('<tbody>')
        .append(event.offers.seller.makesOffer.map(function (offer) {
            var applicationId;
            if (Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom.length > 0) {
                applicationId = offer.availableAtOrFrom[0].id;
            }
            var applicationFromDB = applications.find(((a) => a.id === applicationId));

            return $('<tr>').append([
                $('<td>').text(applicationFromDB.name),
                $('<td>').text(moment(offer.validFrom).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')),
                $('<td>').text(moment(offer.validThrough).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')),
                $('<td>').text(moment(offer.availabilityStarts).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ'))
            ]);
        }))
    var table4makesOffer = $('<table>').addClass('table table-sm')
        .append([thead4makesOffer, tbody4makesOffer]);

    var url4catalog = '/projects/' + PROJECT_ID + '/events/screeningEvent/' + event.id + '/showCatalog';

    var dl = $('<dl>').addClass('row');

    // dl.append($('<dt>').addClass('col-md-3').append('オンライン表示期間'))
    //     .append($('<dd>').addClass('col-md-9').append(
    //         moment(event.offers.availabilityStarts).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')
    //         + ' - '
    //         + moment(event.offers.availabilityEnds).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')
    //     ))
    //     .append($('<dt>').addClass('col-md-3').append('オンライン販売期間'))
    //     .append($('<dd>').addClass('col-md-9').append(
    //         moment(event.offers.validFrom).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')
    //         + ' - '
    //         + moment(event.offers.validThrough).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ssZ')
    //     ));

    dl.append($('<dt>').addClass('col-md-3').append('販売アプリケーション'))
        .append($('<dd>').addClass('col-md-9').append($('<div>').addClass('table-responsive').append(table4makesOffer)));

    dl.append($('<dt>').addClass('col-md-3').append('カタログ'))
        .append($('<dd>').addClass('col-md-9').append($('<a>').attr({
            target: '_blank',
            'href': url4catalog
        }).html('表示 <i class="material-icons" style="font-size: 1.2em;">open_in_new</i>')))
        .append($('<dt>').addClass('col-md-3').append('オファー'))
        .append($('<dd>').addClass('col-md-9').append($('<div>').addClass('table-responsive').append(table)));

    var div = $('<div>').append(dl);

    modal.find('.modal-title').text('興行');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showOffersJson(id) {
    var event = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (event === undefined) {
        alert('イベント' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-event');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(event.offers, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text('offers[json]');
    modal.find('.modal-body').html(div);
    modal.modal();
}

/**
 * 追加特性を見る
 */
function showAdditionalProperty(id) {
    var event = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (event === undefined) {
        alert('イベント' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-event');
    var div = $('<div>')

    if (Array.isArray(event.additionalProperty)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(event.additionalProperty.map(function (property) {
            return $('<tr>').append([
                $('<td>').text(property.name),
                $('<td>').text(property.value)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        div.addClass('table-responsive')
            .append(table);
    } else {
        div.append($('<p>').addClass('description text-center').text('データが見つかりませんでした'));
    }

    modal.find('.modal-title').text('追加特性');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function showPerformance(id) {
    var event = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (event === undefined) {
        alert('イベント' + id + 'が見つかりません');

        return;
    }

    // 編集モーダルオープン
    scheduler.showPerformance(event);
}