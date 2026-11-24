import { pageArgs, paginated } from './paginate.js';

describe('pagination helpers', () => {
  it('computes skip/take', () => {
    expect(pageArgs({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    expect(pageArgs({ page: 3, pageSize: 25 })).toEqual({ skip: 50, take: 25 });
  });

  it('builds the standard envelope', () => {
    expect(paginated(['a', 'b'], 42, { page: 2, pageSize: 20 })).toEqual({
      data: ['a', 'b'],
      meta: { page: 2, pageSize: 20, total: 42, totalPages: 3 },
    });
  });

  it('reports at least one page when empty', () => {
    expect(paginated([], 0, { page: 1, pageSize: 20 }).meta.totalPages).toBe(1);
  });
});
