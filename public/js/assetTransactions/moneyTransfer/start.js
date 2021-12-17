$(function () {
    var issuedThroughSelection = $('#issuedThrough\\[id\\]');
    issuedThroughSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/products/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    typeOf: { $eq: 'PaymentCard' },
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
});
