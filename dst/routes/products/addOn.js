"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * アドオンルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Message = require("../../message");
const productType_1 = require("../../factory/productType");
const NUM_ADDITIONAL_PROPERTY = 10;
const addOnRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
addOnRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // 検証
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        // 検証
        if (validatorResult.isEmpty()) {
            try {
                let product = createFromBody(req, true);
                product = yield productService.create(product);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/products/${product.id}`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], name: {}, alternateName: {}, description: {}, priceSpecification: {
            referenceQuantity: {
                value: 1
            },
            accounting: {}
        }, itemOffered: { name: {} } }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    const searchOfferCatalogsResult = yield offerCatalogService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        itemOffered: { typeOf: { $eq: productType_1.ProductType.Product } }
    });
    res.render('products/new', {
        message: message,
        errors: errors,
        forms: forms,
        offerCatalogs: searchOfferCatalogsResult.data
    });
}));
addOnRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const searchConditions = {
            limit: limit,
            page: page,
            // sort: { 'priceSpecification.price': chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            typeOf: { $eq: productType_1.ProductType.Product }
        };
        const { data } = yield productService.search(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((t) => {
                return Object.assign({}, t);
            })
        });
    }
    catch (err) {
        res.json({
            success: false,
            message: err.message,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
addOnRouter.all('/:id', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let message = '';
        let errors = {};
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let product = yield productService.findById({ id: req.params.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    product = createFromBody(req, false);
                    yield productService.update(product);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign({}, product);
        const searchOfferCatalogsResult = yield offerCatalogService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: productType_1.ProductType.Product } }
        });
        res.render('products/update', {
            message: message,
            errors: errors,
            forms: forms,
            offerCatalogs: searchOfferCatalogsResult.data
        });
    }
    catch (err) {
        next(err);
    }
}));
addOnRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('products/index', {
        message: ''
    });
}));
function createFromBody(req, isNew) {
    var _a, _b, _c;
    let hasOfferCatalog;
    if (typeof ((_a = req.body.hasOfferCatalog) === null || _a === void 0 ? void 0 : _a.id) === 'string' && ((_b = req.body.hasOfferCatalog) === null || _b === void 0 ? void 0 : _b.id.length) > 0) {
        hasOfferCatalog = {
            typeOf: 'OfferCatalog',
            id: (_c = req.body.hasOfferCatalog) === null || _c === void 0 ? void 0 : _c.id
        };
    }
    return Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: productType_1.ProductType.Product, id: req.params.id, 
        // identifier: body.identifier,
        name: req.body.name }, (hasOfferCatalog !== undefined) ? { hasOfferCatalog } : undefined), (!isNew)
        ? {
            $unset: Object.assign({}, (hasOfferCatalog === undefined) ? { hasOfferCatalog: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        // colName = '区分分類';
        // req.checkBody('inCodeSet.identifier').notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));
        // colName = '区分コード';
        // req.checkBody('codeValue')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName))
        //     .isAlphanumeric()
        //     .len({ max: 20 })
        //     // tslint:disable-next-line:no-magic-numbers
        //     .withMessage(Message.Common.getMaxLength(colName, 20));
        express_validator_1.body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30))
    ];
}
exports.default = addOnRouter;
