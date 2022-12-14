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
exports.peopleRouter = void 0;
/**
 * 会員ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const productType_1 = require("../factory/productType");
const CUSTOMER_USER_POOL_ID_NEW = String(process.env.CUSTOMER_USER_POOL_ID_NEW);
const peopleRouter = express.Router();
exports.peopleRouter = peopleRouter;
/**
 * 会員検索
 */
peopleRouter.get('', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const personService = new sdk_1.chevre.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                ? req.query.iss
                : CUSTOMER_USER_POOL_ID_NEW,
            // limit: req.query.limit,
            // page: req.query.page,
            id: (req.query.id !== undefined && req.query.id !== '') ? req.query.id : undefined,
            username: (req.query.username !== undefined && req.query.username !== '') ? req.query.username : undefined,
            email: (req.query.email !== undefined && req.query.email !== '') ? req.query.email : undefined,
            telephone: (req.query.telephone !== undefined && req.query.telephone !== '') ? req.query.telephone : undefined,
            familyName: (req.query.familyName !== undefined && req.query.familyName !== '') ? req.query.familyName : undefined,
            givenName: (req.query.givenName !== undefined && req.query.givenName !== '') ? req.query.givenName : undefined
        };
        if (req.query.format === 'datatable') {
            const searchResult = yield personService.search(searchConditions);
            res.json({
                success: true,
                count: searchResult.data.length,
                results: searchResult.data
            });
        }
        else {
            res.render('people/index', {
                moment: moment,
                searchConditions: searchConditions,
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID_NEW
            });
        }
    }
    catch (error) {
        if (req.query.format === 'datatable') {
            res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
        else {
            next(error);
        }
    }
}));
/**
 * 会員編集
 */
peopleRouter.all('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let message = '';
        const personService = new sdk_1.chevre.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const person = yield personService.findById({
            id: req.params.id,
            iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                ? req.query.iss
                : CUSTOMER_USER_POOL_ID_NEW
        });
        if (req.method === 'DELETE') {
            const physically = req.body.physically === 'on';
            yield personService.deleteById({
                id: person.id,
                physically: physically,
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID_NEW
            });
            res.status(http_status_1.NO_CONTENT)
                .end();
            return;
        }
        else if (req.method === 'POST') {
            try {
                // 管理者としてプロフィール更新の場合、メールアドレスを認証済にセット
                const additionalProperty = (Array.isArray(req.body.additionalProperty))
                    ? req.body.additionalProperty
                    : [];
                additionalProperty.push({
                    name: 'email_verified',
                    value: 'true'
                });
                const profile = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof req.body.familyName === 'string') ? { familyName: req.body.familyName } : {}), (typeof req.body.givenName === 'string') ? { givenName: req.body.givenName } : {}), (typeof req.body.telephone === 'string') ? { telephone: req.body.telephone } : {}), (typeof req.body.email === 'string') ? { email: req.body.email } : {}), { additionalProperty: additionalProperty });
                yield personService.updateProfile(Object.assign(Object.assign({ id: req.params.id }, profile), { iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                        ? req.query.iss
                        : CUSTOMER_USER_POOL_ID_NEW }));
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        res.render('people/details', {
            message: message,
            moment: moment,
            person: person,
            iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                ? req.query.iss
                : CUSTOMER_USER_POOL_ID_NEW
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * タイムライン
 */
peopleRouter.get('/:id/timelines', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const personService = new sdk_1.chevre.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const person = yield personService.findById({
            id: req.params.id,
            iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                ? req.query.iss
                : CUSTOMER_USER_POOL_ID_NEW
        });
        const timelines = [
            {
                // action: {
                //     typeOf: chevre.factory.actionType.CreateAction
                // },
                agent: {
                    id: person.id,
                    name: `${person.givenName} ${person.familyName}`,
                    url: req.originalUrl
                },
                actionName: '作成',
                object: {
                    name: `${person.givenName} ${person.familyName}`,
                    url: req.originalUrl
                },
                startDate: moment(person.UserCreateDate)
                    .toDate(),
                actionStatus: sdk_1.chevre.factory.actionStatusType.CompletedActionStatus,
                actionStatusDescription: 'しました',
                result: {}
            }
        ];
        if (person.Enabled === false
            && person.UserStatus === 'CONFIRMED'
            && typeof person.UserLastModifiedDate === 'string' && person.UserLastModifiedDate.length > 0) {
            timelines.push({
                // action: {
                //     typeOf: chevre.factory.actionType.DeleteAction
                // },
                agent: {
                    id: person.id,
                    name: `${person.givenName} ${person.familyName}`,
                    url: req.originalUrl
                },
                actionName: '削除',
                object: {
                    name: `${person.givenName} ${person.familyName}`,
                    url: req.originalUrl
                },
                startDate: moment(person.UserLastModifiedDate)
                    .toDate(),
                actionStatus: sdk_1.chevre.factory.actionStatusType.CompletedActionStatus,
                actionStatusDescription: 'しました',
                result: {}
            });
        }
        res.json(timelines.sort((a, b) => (moment(a.startDate)
            .isAfter(moment(b.startDate))) ? -1 : 1));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員注文検索
 */
peopleRouter.get('/:id/orders', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const orderService = new sdk_1.chevre.service.Order({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOrdersResult = yield orderService.search({
            limit: req.query.limit,
            page: req.query.page,
            sort: { orderDate: sdk_1.chevre.factory.sortType.Descending },
            orderDateFrom: moment(now)
                .add(-1, 'months')
                .toDate(),
            orderDateThrough: now,
            customer: {
                ids: [req.params.id]
            },
            $projection: {
                acceptedOffers: 0,
                seller: 0
            }
        });
        res.json(searchOrdersResult);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約検索
 */
peopleRouter.get('/:id/reservations', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const personOwnershipInfoService = new sdk_1.chevre.service.person.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchResult = yield personOwnershipInfoService.search({
            // iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
            //     ? req.query.iss
            //     : CUSTOMER_USER_POOL_ID_NEW,
            // iss: req.params.iss,
            limit: req.query.limit,
            page: req.query.page,
            id: req.params.id,
            typeOfGood: {
                issuedThrough: {
                    typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.EventService }
                }
            },
            ownedFrom: moment(now)
                .add(-1, 'month')
                .toDate(),
            ownedThrough: now
        });
        res.json(searchResult);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * メンバーシップ検索
 */
peopleRouter.get('/:id/memberships', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const personOwnershipInfoService = new sdk_1.chevre.service.person.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchResult = yield personOwnershipInfoService.search({
            // iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
            //     ? req.query.iss
            //     : CUSTOMER_USER_POOL_ID_NEW,
            // iss: req.params.iss,
            limit: req.query.limit,
            page: req.query.page,
            id: req.params.id,
            typeOfGood: {
                issuedThrough: { typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.MembershipService } }
            },
            ownedFrom: moment(now)
                .add(-1, 'month')
                .toDate(),
            ownedThrough: now
        });
        res.json(searchResult);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカード検索
 */
peopleRouter.get('/:id/creditCards', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const personOwnershipInfoService = new sdk_1.chevre.service.person.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const creditCards = yield personOwnershipInfoService.searchCreditCards({
            id: req.params.id,
            iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                ? req.query.iss
                : CUSTOMER_USER_POOL_ID_NEW
            // iss: req.params.iss
        });
        res.json(creditCards);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員所有権検索
 */
peopleRouter.get('/:id/ownershipInfos', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const byUsername = req.query.username === '1';
        const message = '';
        const personService = new sdk_1.chevre.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const personOwnershipInfoService = new sdk_1.chevre.service.person.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let person;
        if (byUsername) {
            const searchPeopleResult = yield personService.search({
                username: `${req.params.id}`,
                iss: CUSTOMER_USER_POOL_ID_NEW
            });
            person = searchPeopleResult.data.shift();
            // usernameが完全一致である必要
            if (((_a = person === null || person === void 0 ? void 0 : person.memberOf) === null || _a === void 0 ? void 0 : _a.membershipNumber) !== req.params.id) {
                person = undefined;
            }
        }
        else {
            person = yield personService.findById({
                id: req.params.id,
                iss: CUSTOMER_USER_POOL_ID_NEW
            });
        }
        if (person === undefined) {
            throw new Error(`会員が見つかりませんでした username:${req.params.id}`);
        }
        const includeExpired = req.query.includeExpired === '1';
        const now = new Date();
        const searchConditions = Object.assign({ iss: CUSTOMER_USER_POOL_ID_NEW, limit: req.query.limit, page: req.query.page, id: person.id, typeOfGood: { issuedThrough: { typeOf: { $eq: req.query.issuedThrough } } } }, (includeExpired)
            ? undefined
            : {
                ownedFrom: now,
                ownedThrough: now
            });
        if (req.query.format === 'datatable') {
            const searchResult = yield personOwnershipInfoService.search(searchConditions);
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data.map((r) => {
                    return Object.assign(Object.assign(Object.assign({}, r), (req.query.issuedThrough === sdk_1.chevre.factory.product.ProductType.MembershipService)
                        ? { membershipCode: String(r.typeOfGood.identifier) }
                        : undefined), (req.query.issuedThrough === sdk_1.chevre.factory.product.ProductType.PaymentCard)
                        ? { paymentCardCode: String(r.typeOfGood.identifier) }
                        : undefined);
                })
            });
        }
        else {
            res.render('people/ownershipInfos/index', {
                message: message,
                moment: moment,
                person: person,
                productTypes: productType_1.productTypes
            });
        }
    }
    catch (error) {
        if (req.query.format === 'datatable') {
            res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
        else {
            next(error);
        }
    }
}));
/**
 * クレジットカード削除
 */
// peopleRouter.delete(
//     '/:id/creditCards/:cardSeq',
//     async (req, res, next) => {
//         try {
//             const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
//                 endpoint: <string>process.env.API_ENDPOINT,
//                 auth: req.user.authClient,
//                 project: { id: req.project.id }
//             });
//             await personOwnershipInfoService.deleteCreditCard({
//                 id: req.params.id,
//                 cardSeq: req.params.cardSeq
//             });
//             res.status(NO_CONTENT)
//                 .end();
//         } catch (error) {
//             next(error);
//         }
//     }
// );
peopleRouter.get('/:id/paymentCards', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const personOwnershipInfoService = new sdk_1.chevre.service.person.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOwnershipInfosResult = yield personOwnershipInfoService.search({
            // iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
            //     ? req.query.iss
            //     : CUSTOMER_USER_POOL_ID_NEW,
            // iss: req.params.iss,
            id: req.params.id,
            typeOfGood: {
                issuedThrough: {
                    typeOf: { $eq: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.PaymentCard }
                }
            },
            ownedFrom: moment(now)
                .add(-1, 'month')
                .toDate(),
            ownedThrough: now
        });
        res.json(searchOwnershipInfosResult.data);
    }
    catch (error) {
        next(error);
    }
}));
peopleRouter.all('/:id/profile', 
// ...validate(),
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const iss = (typeof req.query.iss === 'string' && req.query.iss.length > 0)
        ? req.query.iss
        : CUSTOMER_USER_POOL_ID_NEW;
    const personService = new sdk_1.chevre.service.Person({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const person = yield personService.findById({
            id: req.params.id,
            iss
        });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    // 管理者としてプロフィール更新の場合、メールアドレスを認証済にセット
                    const additionalProperty = (Array.isArray(req.body.additionalProperty))
                        ? req.body.additionalProperty
                        : [];
                    additionalProperty.push({
                        name: 'email_verified',
                        value: 'true'
                    });
                    const profile = Object.assign(Object.assign({}, req.body), { additionalProperty: additionalProperty });
                    yield personService.updateProfile(Object.assign(Object.assign({}, profile), { iss, id: req.params.id }));
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({}, person), req.body);
        // if (req.method === 'POST') {
        // } else {
        // }
        res.render('people/profile', {
            message: message,
            errors: errors,
            forms: forms,
            person
        });
    }
    catch (error) {
        next(error);
    }
}));
