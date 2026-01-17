package tn.sage.rh.config;

import org.hibernate.dialect.PostgreSQLDialect;

public class PostgresDialect extends PostgreSQLDialect {
    @Override
    public String getCheckCondition(String columnName, String[] values) {
        return null;
    }
}
