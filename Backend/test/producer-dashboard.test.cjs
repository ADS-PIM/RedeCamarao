const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Offer, OfferStatus } = require('../src/domain/model/offer.ts');
const { ListOffersByUserId } = require('../src/application/usecase/offer/ListOffersByUserIdUseCase.ts');

test('authenticated listing preserves all editable fields for duplication without exposing the owner', async () => {
    const props = {
        id: 'offer-1', userId: 'producer-1', title: 'Camarão cinza', description: 'Lote em gelo.',
        type: null, size: 'Médio', price: 34.9, weight: 80, minimumQuantity: 20, maximumQuantity: 80,
        location: 'Fortim, CE', startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: new Date('2026-11-30T00:00:00Z'), status: OfferStatus.INACTIVE,
        createdAt: new Date('2026-11-01T10:15:00Z')
    };
    const useCase = new ListOffersByUserId({ listByUserId: async id => {
        assert.equal(id, 'producer-1');
        return [Offer.reconstruct(props)];
    } }, { searchById: async () => ({ id: 'producer-1' }) });
    const { userId, ...expected } = props;
    assert.deepEqual(await useCase.execute('producer-1'), [expected]);
});

test('missing account does not query offers', async () => {
    const useCase = new ListOffersByUserId({ listByUserId: async () => {
        throw new Error('Must not query offers for missing user');
    } }, { searchById: async () => null });
    await assert.rejects(useCase.execute('missing'), error => error.code === 'USER_NOT_FOUND');
});
